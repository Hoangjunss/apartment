import { prisma } from '@my/prisma';
import { generateWeeklyReportEmail, sendEmail } from '@my/email';

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

/**
 * 5. Báo cáo vận hành Tuần (Weekly Report)
 */
export const getWeeklyReportData = async (buildingIds = null) => {
  const thisWeekEnd = new Date();
  const thisWeekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  const lastWeekEnd = thisWeekStart;
  const lastWeekStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  
  const sevenDaysAgo = thisWeekStart;

  // 1. TÀI CHÍNH TUẦN
  // Doanh thu thực tế (Tổng payments nhận được trong tuần)
  const paymentsThisWeekWhere = { payment_date: { gte: thisWeekStart, lte: thisWeekEnd } };
  if (buildingIds) {
    paymentsThisWeekWhere.invoice = { apartment: { floor: { building_id: { in: buildingIds } } } };
  }
  const paymentsThisWeek = await prisma.payments.aggregate({
    _sum: { amount: true },
    where: paymentsThisWeekWhere
  });

  const paymentsLastWeekWhere = { payment_date: { gte: lastWeekStart, lte: lastWeekEnd } };
  if (buildingIds) {
    paymentsLastWeekWhere.invoice = { apartment: { floor: { building_id: { in: buildingIds } } } };
  }
  const paymentsLastWeek = await prisma.payments.aggregate({
    _sum: { amount: true },
    where: paymentsLastWeekWhere
  });
  
  const collected = Number(paymentsThisWeek._sum.amount || 0);
  const collectedLastWeek = Number(paymentsLastWeek._sum.amount || 0);
  const collectedDiff = collected - collectedLastWeek;

  // Chi phí thực tế (Tổng building expenses ở trạng thái PAID)
  const expensesThisWeekWhere = { expense_date: { gte: thisWeekStart, lte: thisWeekEnd }, status: 'PAID', deleted_at: null };
  if (buildingIds) {
    expensesThisWeekWhere.building_id = { in: buildingIds };
  }
  const expensesThisWeek = await prisma.buildingExpenses.aggregate({
    _sum: { amount: true },
    where: expensesThisWeekWhere
  });

  const expensesLastWeekWhere = { expense_date: { gte: lastWeekStart, lte: lastWeekEnd }, status: 'PAID', deleted_at: null };
  if (buildingIds) {
    expensesLastWeekWhere.building_id = { in: buildingIds };
  }
  const expensesLastWeek = await prisma.buildingExpenses.aggregate({
    _sum: { amount: true },
    where: expensesLastWeekWhere
  });
  
  const expenses = Number(expensesThisWeek._sum.amount || 0);
  const expensesLastWeekVal = Number(expensesLastWeek._sum.amount || 0);
  const expensesDiff = expenses - expensesLastWeekVal;

  // Còn cần thu (Các hóa đơn phát sinh trong tuần chưa thu xong)
  const invoicesThisWeekWhere = { created_at: { gte: thisWeekStart, lte: thisWeekEnd }, deleted_at: null };
  if (buildingIds) {
    invoicesThisWeekWhere.apartment = { floor: { building_id: { in: buildingIds } } };
  }
  const invoicesThisWeek = await prisma.invoices.findMany({
    where: invoicesThisWeekWhere,
    include: { payments: true }
  });

  const invoicesLastWeekWhere = { created_at: { gte: lastWeekStart, lte: lastWeekEnd }, deleted_at: null };
  if (buildingIds) {
    invoicesLastWeekWhere.apartment = { floor: { building_id: { in: buildingIds } } };
  }
  const invoicesLastWeek = await prisma.invoices.findMany({
    where: invoicesLastWeekWhere,
    include: { payments: true }
  });
  
  let pending = 0;
  for (const inv of invoicesThisWeek) {
    const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
    pending += Math.max(0, Number(inv.total_amount) - paid);
  }
  
  let pendingLastWeek = 0;
  for (const inv of invoicesLastWeek) {
    const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
    pendingLastWeek += Math.max(0, Number(inv.total_amount) - paid);
  }
  const pendingDiff = pending - pendingLastWeek;

  // 2. TÌNH TRẠNG HỢP ĐỒNG
  // Hợp đồng mới ký trong tuần
  const signedThisWeekWhere = { created_at: { gte: thisWeekStart, lte: thisWeekEnd }, deleted_at: null };
  if (buildingIds) {
    signedThisWeekWhere.apartment = { floor: { building_id: { in: buildingIds } } };
  }
  const signedThisWeek = await prisma.contracts.count({
    where: signedThisWeekWhere
  });

  const signedLastWeekWhere = { created_at: { gte: lastWeekStart, lte: lastWeekEnd }, deleted_at: null };
  if (buildingIds) {
    signedLastWeekWhere.apartment = { floor: { building_id: { in: buildingIds } } };
  }
  const signedLastWeek = await prisma.contracts.count({
    where: signedLastWeekWhere
  });
  const signedDiff = signedThisWeek - signedLastWeek;

  // Hợp đồng sắp hết hạn trong 30 ngày (tính từ thời điểm xét báo cáo)
  const next30Days = new Date(thisWeekEnd.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiringThisWeekWhere = {
    end_date: { gte: thisWeekEnd, lte: next30Days },
    status: { in: ['ACTIVE', 'EXPIRING_SOON'] },
    deleted_at: null
  };
  if (buildingIds) {
    expiringThisWeekWhere.apartment = { floor: { building_id: { in: buildingIds } } };
  }
  const expiringThisWeek = await prisma.contracts.count({
    where: expiringThisWeekWhere
  });

  const next30DaysFromLastWeek = new Date(lastWeekEnd.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiringLastWeekWhere = {
    end_date: { gte: lastWeekEnd, lte: next30DaysFromLastWeek },
    start_date: { lte: lastWeekEnd },
    deleted_at: null
  };
  if (buildingIds) {
    expiringLastWeekWhere.apartment = { floor: { building_id: { in: buildingIds } } };
  }
  const expiringLastWeek = await prisma.contracts.count({
    where: expiringLastWeekWhere
  });
  const expiringDiff = expiringThisWeek - expiringLastWeek;

  // 3. HÓA ĐƠN CÔNG NỢ (Tồn đọng)
  const allInvoicesWhere = { deleted_at: null };
  if (buildingIds) {
    allInvoicesWhere.apartment = { floor: { building_id: { in: buildingIds } } };
  }
  const allInvoices = await prisma.invoices.findMany({
    where: allInvoicesWhere,
    include: { payments: true }
  });

  let unpaidCount = 0;
  let unpaidAmount = 0;
  let overdueCount = 0;
  let overdueAmount = 0;

  let unpaidCountLastWeek = 0;
  let unpaidAmountLastWeek = 0;
  let overdueCountLastWeek = 0;
  let overdueAmountLastWeek = 0;

  for (const inv of allInvoices) {
    const createdDate = new Date(inv.created_at);
    const dueDate = new Date(inv.due_date);

    // Tính toán cho tuần này (hiện tại)
    const totalPaidThisWeek = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
    const remainingThisWeek = Math.max(0, Number(inv.total_amount) - totalPaidThisWeek);
    if (remainingThisWeek > 0) {
      unpaidCount++;
      unpaidAmount += remainingThisWeek;
      if (dueDate < thisWeekEnd || inv.status === 'OVERDUE') {
        overdueCount++;
        overdueAmount += remainingThisWeek;
      }
    }

    // Tính toán cho tuần trước (lùi về 7 ngày trước)
    if (createdDate <= sevenDaysAgo) {
      const paymentsLastWeek = inv.payments.filter(p => new Date(p.payment_date) <= sevenDaysAgo);
      const totalPaidLastWeek = paymentsLastWeek.reduce((s, p) => s + Number(p.amount), 0);
      const remainingLastWeek = Math.max(0, Number(inv.total_amount) - totalPaidLastWeek);
      if (remainingLastWeek > 0) {
        unpaidCountLastWeek++;
        unpaidAmountLastWeek += remainingLastWeek;
        if (dueDate < sevenDaysAgo) {
          overdueCountLastWeek++;
          overdueAmountLastWeek += remainingLastWeek;
        }
      }
    }
  }

  const unpaidCountDiff = unpaidCount - unpaidCountLastWeek;
  const unpaidAmountDiff = unpaidAmount - unpaidAmountLastWeek;
  const overdueCountDiff = overdueCount - overdueCountLastWeek;
  const overdueAmountDiff = overdueAmount - overdueAmountLastWeek;

  // 4. TỈ LỆ LẤP ĐẦY
  const aptsCountWhere = { deleted_at: null };
  if (buildingIds) {
    aptsCountWhere.floor = { building_id: { in: buildingIds } };
  }
  const totalApartments = await prisma.apartments.count({ where: aptsCountWhere });

  const occupiedThisWeekWhere = { status: 'OCCUPIED', deleted_at: null };
  if (buildingIds) {
    occupiedThisWeekWhere.floor = { building_id: { in: buildingIds } };
  }
  const occupiedThisWeek = await prisma.apartments.count({
    where: occupiedThisWeekWhere
  });
  
  // Tổng hợp hợp đồng đang hoạt động 7 ngày trước để tính tỉ lệ lấp đầy tuần trước
  const occupiedLastWeekWhere = {
    start_date: { lte: sevenDaysAgo },
    end_date: { gte: sevenDaysAgo },
    deleted_at: null
  };
  if (buildingIds) {
    occupiedLastWeekWhere.apartment = { floor: { building_id: { in: buildingIds } } };
  }
  const occupiedLastWeek = await prisma.contracts.count({
    where: occupiedLastWeekWhere
  });

  const rate = totalApartments > 0 ? Number(((occupiedThisWeek / totalApartments) * 100).toFixed(1)) : 0;
  const rateLastWeek = totalApartments > 0 ? Number(((occupiedLastWeek / totalApartments) * 100).toFixed(1)) : 0;
  const rateDiff = rate - rateLastWeek;

  // 5. SỰ CỐ KỸ THUẬT
  const requestsWhere = { deleted_at: null };
  if (buildingIds) {
    requestsWhere.apartment = { floor: { building_id: { in: buildingIds } } };
  }
  const allRequests = await prisma.serviceRequests.findMany({
    where: requestsWhere
  });

  let open = 0;
  let resolved = 0;
  let openLastWeek = 0;
  let resolvedLastWeek = 0;

  for (const req of allRequests) {
    const createdAt = new Date(req.created_at);
    const resolvedAt = req.resolved_at ? new Date(req.resolved_at) : null;

    // Tuần này
    if (req.status !== 'RESOLVED' && req.status !== 'CANCELLED') {
      open++;
    } else if (req.status === 'RESOLVED' && resolvedAt && resolvedAt >= thisWeekStart && resolvedAt <= thisWeekEnd) {
      resolved++;
    }

    // Tuần trước (tại thời điểm 7 ngày trước)
    if (createdAt <= sevenDaysAgo) {
      const isResolvedByThen = resolvedAt && resolvedAt <= sevenDaysAgo;
      const isCancelledByThen = req.status === 'CANCELLED' && new Date(req.updated_at) <= sevenDaysAgo;

      if (!isResolvedByThen && !isCancelledByThen) {
        openLastWeek++;
      }

      if (req.status === 'RESOLVED' && resolvedAt && resolvedAt >= lastWeekStart && resolvedAt <= lastWeekEnd) {
        resolvedLastWeek++;
      }
    }
  }

  const openDiff = open - openLastWeek;
  const resolvedDiff = resolved - resolvedLastWeek;

  // 6. TOP 5 HOẠT ĐỘNG NỔI BẬT
  const auditLogsWhere = { created_at: { gte: thisWeekStart, lte: thisWeekEnd } };
  
  if (buildingIds) {
    // Lấy ID các tài nguyên trong các tòa nhà này
    const apartments = await prisma.apartments.findMany({
      where: { floor: { building_id: { in: buildingIds } } },
      select: { id: true }
    });
    const apartmentIds = apartments.map(a => a.id);
    
    const contracts = await prisma.contracts.findMany({
      where: { apartment: { floor: { building_id: { in: buildingIds } } } },
      select: { id: true }
    });
    const contractIds = contracts.map(c => c.id);
    
    const invoices = await prisma.invoices.findMany({
      where: { apartment: { floor: { building_id: { in: buildingIds } } } },
      select: { id: true }
    });
    const invoiceIds = invoices.map(i => i.id);
    
    const serviceRequests = await prisma.serviceRequests.findMany({
      where: { apartment: { floor: { building_id: { in: buildingIds } } } },
      select: { id: true }
    });
    const serviceRequestIds = serviceRequests.map(s => s.id);
    
    auditLogsWhere.OR = [
      { resource_type: 'Apartment', resource_id: { in: apartmentIds } },
      { resource_type: 'Contract', resource_id: { in: contractIds } },
      { resource_type: 'Invoice', resource_id: { in: invoiceIds } },
      { resource_type: 'ServiceRequest', resource_id: { in: serviceRequestIds } }
    ];
  }

  const auditLogs = await prisma.auditLogs.findMany({
    where: auditLogsWhere,
    orderBy: { created_at: 'desc' },
    take: 5
  });

  const activities = auditLogs.map(log => {
    let actionText = 'thao tác';
    if (log.action === 'CREATE') actionText = 'thêm mới';
    else if (log.action === 'UPDATE') actionText = 'cập nhật';
    else if (log.action === 'DELETE') actionText = 'xóa';

    let resourceText = log.resource_type;
    if (log.resource_type === 'Contract') resourceText = 'hợp đồng';
    else if (log.resource_type === 'Invoice') resourceText = 'hóa đơn';
    else if (log.resource_type === 'Tenant') resourceText = 'khách thuê';
    else if (log.resource_type === 'Apartment') resourceText = 'căn hộ';
    else if (log.resource_type === 'ServiceRequest') resourceText = 'yêu cầu kỹ thuật';

    return {
      title: `${log.actor_name} đã ${actionText} ${resourceText}`,
      detail: `Chi tiết: ID đối tượng: ${log.resource_id || '—'}. Thao tác: ${log.action}`,
      time: log.created_at
    };
  });

  return {
    finance: { collected, collectedDiff, expenses, expensesDiff, pending, pendingDiff },
    contracts: { expiring: expiringThisWeek, expiringDiff, signed: signedThisWeek, signedDiff },
    invoices: { unpaidCount, unpaidCountDiff, unpaidAmount, unpaidAmountDiff, overdueCount, overdueCountDiff, overdueAmount, overdueAmountDiff },
    occupancy: { rate, rateDiff },
    serviceRequests: { open, openDiff, resolved, resolvedDiff },
    activities
  };
};

// Hàm helper delay dạng Promise dùng cho retry logic
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Thực thi quy trình tổng hợp, kết xuất và gửi báo cáo tuần (dùng chung cho Scheduler và REST API)
 */
export const runWeeklyReport = async (userIds = null) => {
  console.log('[REPORT SERVICE] Khởi động luồng gửi báo cáo tuần...');
  
  // 1. Lấy danh sách users nhận từ DB (các users có quyền nhận báo cáo hoạt động tốt)
  let users;
  if (userIds && Array.isArray(userIds) && userIds.length > 0) {
    users = await prisma.users.findMany({
      where: {
        id: { in: userIds },
        role: { in: ['ADMIN', 'MANAGER'] },
        is_active: true,
        deleted_at: null
      },
      include: {
        building_assignments: {
          where: { revoked_at: null },
          include: { building: true }
        }
      }
    });
  } else {
    // Luồng tự động chạy từ Scheduler
    users = await prisma.users.findMany({
      where: {
        receive_weekly_report: true,
        role: { in: ['ADMIN', 'MANAGER'] },
        is_active: true,
        deleted_at: null
      },
      include: {
        building_assignments: {
          where: { revoked_at: null },
          include: { building: true }
        }
      }
    });
  }

  // Fallback sang cấu hình biến môi trường nếu DB không có ai đăng ký và không chọn cụ thể
  if (users.length === 0 && (!userIds || userIds.length === 0) && process.env.REPORT_EMAIL_RECIPIENTS) {
    const fallbackEmails = process.env.REPORT_EMAIL_RECIPIENTS
      .split(',')
      .map(e => e.trim())
      .filter(Boolean);

    // Tạo các đối tượng user ảo cho cấu hình fallback
    users = fallbackEmails.map((email, idx) => ({
      id: -(idx + 1), // ID âm cho fallback
      email,
      full_name: 'Người nhận cấu hình (.env)',
      role: 'ADMIN', // Xem như Admin để nhận báo cáo toàn hệ thống
      building_assignments: []
    }));
  }

  if (users.length === 0) {
    throw new Error('Không tìm thấy người nhận nào hợp lệ để gửi báo cáo tuần.');
  }

  const results = [];
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  // 2. Gửi email tới từng tài khoản
  for (const user of users) {
    const email = user.email;
    if (!email) continue;

    // Xác định bộ lọc tòa nhà & tên phạm vi báo cáo cho người dùng này
    let buildingIds = null;
    let scopeName = 'Toàn hệ thống';

    if (user.role === 'MANAGER') {
      const assigned = user.building_assignments || [];
      if (assigned.length > 0) {
        buildingIds = assigned.map(ba => ba.building_id);
        scopeName = assigned.map(ba => ba.building.name).join(', ');
      } else {
        // Manager không có tòa nhà được phân công -> không gửi hoặc gửi báo cáo trống
        buildingIds = [];
        scopeName = 'Không có tòa nhà phụ trách';
      }
    }

    let success = false;
    let attempt = 0;
    let lastError = null;

    try {
      // Truy xuất dữ liệu báo cáo được lọc riêng theo phạm vi của người nhận này
      const reportData = await getWeeklyReportData(buildingIds);

      // Tạo nội dung HTML cho email
      const htmlContent = generateWeeklyReportEmail(reportData, frontendUrl, scopeName);
      const subject = `Báo cáo vận hành tuần [${scopeName}] - ${new Date().toLocaleDateString('vi-VN')}`;

      // Thử tối đa 4 lần (Lần đầu + 3 lần retry)
      while (attempt < 4 && !success) {
        try {
          if (attempt > 0) {
            console.log(`[REPORT SERVICE] Thử lại gửi thư tới ${email} sau 30 giây (Lần ${attempt}/3)...`);
            await delay(30000);
          }

          await sendEmail({
            to: email,
            subject,
            html: htmlContent
          });

          success = true;
          console.log(`[REPORT SERVICE] Gửi thành công tới: ${email} (Phạm vi: ${scopeName})`);
        } catch (err) {
          attempt++;
          lastError = err;
          console.error(`[REPORT SERVICE] Gửi tới ${email} thất bại (Lần ${attempt}/4):`, err.message);
        }
      }

      // 3. Ghi log lịch sử gửi vào bảng EmailLogs
      try {
        await prisma.emailLogs.create({
          data: {
            recipient: email,
            subject,
            status: success ? 'SUCCESS' : 'FAILED',
            retry_count: Math.max(0, attempt - 1),
            error_message: success ? null : (lastError?.stack || lastError?.message || String(lastError)),
            sent_at: new Date()
          }
        });
      } catch (dbErr) {
        console.error(`[REPORT SERVICE] Lỗi ghi log gửi email cho ${email}:`, dbErr.message);
      }

    } catch (reportErr) {
      lastError = reportErr;
      console.error(`[REPORT SERVICE] Lỗi tính toán báo cáo tuần cho ${email}:`, reportErr.message);
    }

    results.push({ email, success, attempts: attempt, scope: scopeName, error: success ? null : lastError?.message });
  }

  return results;
};

/**
 * Lấy danh sách tài khoản cấp quản trị/quản lý kèm tòa nhà phụ trách
 */
export const getWeeklyReportCandidates = async () => {
  const users = await prisma.users.findMany({
    where: {
      role: { in: ['ADMIN', 'MANAGER'] },
      is_active: true,
      deleted_at: null
    },
    select: {
      id: true,
      email: true,
      full_name: true,
      role: true,
      building_assignments: {
        where: { revoked_at: null },
        select: {
          building: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  });

  return users.map(u => ({
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    role: u.role,
    buildings: u.building_assignments.map(ba => ba.building).filter(Boolean)
  }));
};


