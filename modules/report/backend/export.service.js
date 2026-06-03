import { prisma } from '@my/prisma';
import xlsx from 'xlsx';
import { getRevenueReport } from './service.js';

const formatDate = (date) => (date ? new Date(date).toISOString().split('T')[0] : '—');

export const exportTenants = async (params = {}) => {
  const { search } = params;
  const where = { deleted_at: null };

  if (search) {
    where.OR = [
      { full_name: { contains: search } },
      { phone: { contains: search } },
      { national_id: { contains: search } },
    ];
  }

  const tenants = await prisma.tenants.findMany({
    where,
    orderBy: { created_at: 'desc' },
  });

  const data = tenants.map((t) => ({
    'Họ và tên': t.full_name,
    'Số CCCD / Passport': t.national_id,
    'Ngày sinh': formatDate(t.date_of_birth),
    'Giới tính': t.gender === 'MALE' ? 'Nam' : t.gender === 'FEMALE' ? 'Nữ' : 'Khác',
    'Số điện thoại': t.phone,
    'Email': t.email || '—',
    'Địa chỉ thường trú': t.permanent_address,
    'Quốc tịch': t.nationality,
    'Nghề nghiệp': t.occupation || '—',
    'Ngày tạo hồ sơ': formatDate(t.created_at),
  }));

  return generateBuffer(data, 'Tenants');
};

export const exportContracts = async (params = {}) => {
  const { status, search } = params;
  const where = { deleted_at: null };

  if (status) where.status = status;
  if (search) {
    where.OR = [
      { contract_code: { contains: search } },
      { tenant: { full_name: { contains: search } } },
      { apartment: { apartment_code: { contains: search } } },
    ];
  }

  const contracts = await prisma.contracts.findMany({
    where,
    include: {
      tenant: { select: { full_name: true } },
      apartment: { select: { apartment_code: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  const data = contracts.map((c) => ({
    'Mã hợp đồng': c.contract_code,
    'Khách thuê': c.tenant.full_name,
    'Căn hộ': c.apartment.apartment_code,
    'Ngày bắt đầu': formatDate(c.start_date),
    'Ngày kết thúc': formatDate(c.end_date),
    'Tiền thuê hàng tháng (VND)': Number(c.monthly_rent),
    'Tiền đặt cọc (VND)': Number(c.deposit_amount),
    'Số người ở': c.soNguoiO,
    'Trạng thái':
      c.status === 'ACTIVE'
        ? 'Đang hoạt động'
        : c.status === 'EXPIRING_SOON'
        ? 'Sắp hết hạn'
        : c.status === 'EXPIRED'
        ? 'Đã hết hạn'
        : 'Đã thanh lý',
  }));

  return generateBuffer(data, 'Contracts');
};

export const exportInvoices = async (params = {}) => {
  const { status, billing_month, search } = params;
  const where = { deleted_at: null };

  if (status) where.status = status;
  if (billing_month) where.billing_month = billing_month;
  if (search) {
    where.OR = [
      { invoice_code: { contains: search } },
      { contract: { contract_code: { contains: search } } },
      { apartment: { apartment_code: { contains: search } } },
    ];
  }

  const invoices = await prisma.invoices.findMany({
    where,
    include: {
      apartment: { select: { apartment_code: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  const data = invoices.map((inv) => ({
    'Mã hóa đơn': inv.invoice_code,
    'Căn hộ': inv.apartment.apartment_code,
    'Tháng thanh toán': inv.billing_month,
    'Tiền thuê phòng (VND)': Number(inv.rent_amount),
    'Tiền điện (VND)': Number(inv.electricity_amount),
    'Tiền nước (VND)': Number(inv.water_amount),
    'Tiền dịch vụ (VND)': Number(inv.service_amount),
    'Chi phí khác (VND)': Number(inv.other_amount),
    'Tổng số tiền (VND)': Number(inv.total_amount),
    'Hạn thanh toán': formatDate(inv.due_date),
    'Trạng thái':
      inv.status === 'PAID'
        ? 'Đã thanh toán'
        : inv.status === 'PARTIALLY_PAID'
        ? 'Thanh toán một phần'
        : inv.status === 'OVERDUE'
        ? 'Quá hạn'
        : 'Chưa thanh toán',
  }));

  return generateBuffer(data, 'Invoices');
};

export const exportRevenue = async (params = {}) => {
  const reportData = await getRevenueReport(params);

  const data = reportData.map((r) => ({
    'Tháng thanh toán': r.month,
    'Tiền thuê phòng dự kiến (VND)': r.expected_rent,
    'Tiền điện dự kiến (VND)': r.expected_electricity,
    'Tiền nước dự kiến (VND)': r.expected_water,
    'Tiền dịch vụ dự kiến (VND)': r.expected_service,
    'Chi phí khác dự kiến (VND)': r.expected_other,
    'Tổng doanh thu dự kiến (VND)': r.expected_total,
    'Thực tế thu được (VND)': r.actual_collected,
    'Số tiền chưa thu (VND)': r.unpaid_amount,
  }));

  return generateBuffer(data, 'Revenue');
};

const generateBuffer = (data, sheetName) => {
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(data);
  xlsx.utils.book_append_sheet(wb, ws, sheetName);
  
  const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const csvContent = xlsx.utils.sheet_to_csv(ws);

  return {
    excelBuffer,
    csvContent,
  };
};
