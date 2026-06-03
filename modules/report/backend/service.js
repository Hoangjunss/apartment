import { prisma } from '@my/prisma';

/**
 * 1. Báo cáo Doanh thu (Doanh thu dự kiến từ hóa đơn vs Thực tế thu được từ thanh toán)
 */
export const getRevenueReport = async ({ building_id, from_month, to_month }) => {
  const whereInvoice = {
    deleted_at: null,
  };
  
  if (from_month && to_month) {
    whereInvoice.billing_month = { gte: from_month, lte: to_month };
  } else if (from_month) {
    whereInvoice.billing_month = { gte: from_month };
  } else if (to_month) {
    whereInvoice.billing_month = { lte: to_month };
  }

  if (building_id) {
    whereInvoice.apartment = {
      floor: { building_id: Number(building_id) }
    };
  }

  // Lấy danh sách hóa đơn thỏa mãn bộ lọc
  const invoices = await prisma.invoices.findMany({
    where: whereInvoice,
    include: {
      payments: true,
      apartment: {
        select: {
          apartment_code: true,
          floor: {
            select: {
              building: {
                select: { name: true }
              }
            }
          }
        }
      }
    }
  });

  // Gom nhóm dữ liệu theo tháng
  const monthlyData = {};

  invoices.forEach(inv => {
    const month = inv.billing_month; // YYYY-MM
    if (!monthlyData[month]) {
      monthlyData[month] = {
        month,
        expected_rent: 0,
        expected_electricity: 0,
        expected_water: 0,
        expected_service: 0,
        expected_other: 0,
        expected_total: 0,
        actual_collected: 0,
        unpaid_amount: 0,
      };
    }

    const rent = Number(inv.rent_amount || 0);
    const elec = Number(inv.electricity_amount || 0);
    const water = Number(inv.water_amount || 0);
    const svc = Number(inv.service_amount || 0);
    const other = Number(inv.other_amount || 0);
    const total = Number(inv.total_amount || 0);

    monthlyData[month].expected_rent += rent;
    monthlyData[month].expected_electricity += elec;
    monthlyData[month].expected_water += water;
    monthlyData[month].expected_service += svc;
    monthlyData[month].expected_other += other;
    monthlyData[month].expected_total += total;

    // Tính tiền thực thu từ danh sách payments của hóa đơn này
    let paidForInvoice = 0;
    inv.payments.forEach(p => {
      paidForInvoice += Number(p.amount || 0);
    });

    monthlyData[month].actual_collected += paidForInvoice;
  });

  // Tính số tiền chưa thu và chuyển đổi thành array, sắp xếp theo tháng
  const result = Object.values(monthlyData).map(m => {
    m.unpaid_amount = Math.max(0, m.expected_total - m.actual_collected);
    return m;
  }).sort((a, b) => a.month.localeCompare(b.month));

  return result;
};

/**
 * 2. Báo cáo Tỷ lệ Lấp đầy (Occupancy Report)
 */
export const getOccupancyReport = async ({ building_id }) => {
  const where = { deleted_at: null };
  if (building_id) {
    where.floor = { building_id: Number(building_id) };
  }

  const apartments = await prisma.apartments.findMany({
    where,
    select: { status: true }
  });

  const total = apartments.length;
  const statusCounts = {
    AVAILABLE: 0,
    OCCUPIED: 0,
    MAINTENANCE: 0,
    RESERVED: 0,
  };

  apartments.forEach(apt => {
    if (statusCounts[apt.status] !== undefined) {
      statusCounts[apt.status]++;
    }
  });

  const occupiedCount = statusCounts.OCCUPIED;
  const occupancyRate = total > 0 ? Number(((occupiedCount / total) * 100).toFixed(1)) : 0;

  return {
    total,
    statusCounts,
    occupancyRate,
  };
};

/**
 * 3. Báo cáo Sự cố Kỹ thuật (Maintenance Report)
 */
export const getMaintenanceReport = async ({ building_id, from_month, to_month }) => {
  const where = {};

  if (building_id) {
    where.apartment = {
      floor: { building_id: Number(building_id) }
    };
  }

  // Lọc theo ngày tạo
  if (from_month || to_month) {
    where.created_at = {};
    if (from_month) {
      where.created_at.gte = new Date(`${from_month}-01T00:00:00.000Z`);
    }
    if (to_month) {
      // Ngày cuối cùng của tháng kết thúc
      const [year, month] = to_month.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      where.created_at.lte = new Date(`${to_month}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`);
    }
  }

  const requests = await prisma.serviceRequests.findMany({
    where,
    select: { status: true }
  });

  const total = requests.length;
  const statusCounts = {
    PENDING: 0,
    ASSIGNED: 0,
    IN_PROGRESS: 0,
    RESOLVED: 0,
    CANCELLED: 0,
    POSTPONED: 0
  };

  requests.forEach(req => {
    if (statusCounts[req.status] !== undefined) {
      statusCounts[req.status]++;
    }
  });

  return {
    total,
    statusCounts,
  };
};

/**
 * 4. Báo cáo Hợp đồng (Contract Report)
 */
export const getContractsReport = async ({ building_id, from_month, to_month }) => {
  const where = { deleted_at: null };

  if (building_id) {
    where.apartment = {
      floor: { building_id: Number(building_id) }
    };
  }

  if (from_month || to_month) {
    where.start_date = {};
    if (from_month) {
      where.start_date.gte = new Date(`${from_month}-01`);
    }
    if (to_month) {
      const [year, month] = to_month.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      where.start_date.lte = new Date(`${to_month}-${String(lastDay).padStart(2, '0')}`);
    }
  }

  const contracts = await prisma.contracts.findMany({
    where,
    select: { status: true }
  });

  const total = contracts.length;
  const statusCounts = {
    ACTIVE: 0,
    EXPIRING_SOON: 0,
    EXPIRED: 0,
    TERMINATED: 0,
  };

  contracts.forEach(c => {
    if (statusCounts[c.status] !== undefined) {
      statusCounts[c.status]++;
    }
  });

  return {
    total,
    statusCounts,
  };
};
