import { prisma } from '@my/prisma';
import { createNotification } from '@my/notifications-backend/service';
import { WATER_PRICE_PER_PERSON } from './constants.js';
import { calculateWaterCost } from './utils.js';
import xlsx from 'xlsx';

// ==========================================
// UTILITY READINGS (ĐIỆN NƯỚC)
// ==========================================

export const getUtilityReadings = async ({ page = 1, limit = 20, apartment_id, billing_month }) => {
  const where = {};
  if (apartment_id) where.apartment_id = apartment_id;
  if (billing_month) where.billing_month = billing_month;

  const [items, total] = await Promise.all([
    prisma.utilityReadings.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [
        { billing_month: 'desc' },
        { recorded_at: 'desc' }
      ],
      include: {
        apartment: {
          include: {
            contracts: {
              where: { status: 'ACTIVE' },
              select: { soNguoiO: true }
            }
          }
        },
        recorder: { select: { id: true, full_name: true } }
      }
    }),
    prisma.utilityReadings.count({ where })
  ]);

  return { items, total, page, limit };
};

export const recordUtilityReading = async (data, userId) => {
  const { apartment_id, billing_month, electricity_curr, water_curr, soNguoiO, electricity_unit_price, water_unit_price } = data;

  if (!apartment_id || !billing_month || electricity_curr === undefined) {
    throw new Error('Thiếu thông tin ghi nhận số điện bắt buộc');
  }

  // Validate format YYYY-MM
  if (!/^\d{4}-\d{2}$/.test(billing_month)) {
    throw new Error('Định dạng tháng thanh toán không hợp lệ (yêu cầu YYYY-MM)');
  }

  // Check unique constraint [apartment_id, billing_month]
  const existing = await prisma.utilityReadings.findUnique({
    where: {
      apartment_id_billing_month: {
        apartment_id,
        billing_month
      }
    }
  });

  if (existing) {
    throw new Error(`Căn hộ này đã được ghi chỉ số điện nước cho tháng ${billing_month}`);
  }

  // Find previous reading (highest month < current billing_month)
  const prevReading = await prisma.utilityReadings.findFirst({
    where: {
      apartment_id,
      billing_month: { lt: billing_month }
    },
    orderBy: { billing_month: 'desc' }
  });

  const electricity_prev = prevReading ? Number(prevReading.electricity_curr) : 0;
  const water_prev = prevReading && prevReading.water_curr !== null ? Number(prevReading.water_curr) : null;

  if (Number(electricity_curr) < electricity_prev) {
    throw new Error(`Chỉ số điện mới (${electricity_curr}) không được nhỏ hơn chỉ số điện cũ (${electricity_prev})`);
  }

  if (water_curr !== undefined && water_curr !== null && water_prev !== null) {
    if (Number(water_curr) < water_prev) {
      throw new Error(`Chỉ số nước mới (${water_curr}) không được nhỏ hơn chỉ số nước cũ (${water_prev})`);
    }
  }

  // Fallback for soNguoiO: find from active contract if not provided
  let final_soNguoiO = soNguoiO !== undefined && soNguoiO !== null ? Number(soNguoiO) : null;
  if (!final_soNguoiO) {
    const activeContract = await prisma.contracts.findFirst({
      where: { apartment_id, status: 'ACTIVE' }
    });
    final_soNguoiO = activeContract ? activeContract.soNguoiO : 1;
  }

  return prisma.utilityReadings.create({
    data: {
      apartment_id,
      billing_month,
      electricity_prev,
      electricity_curr: Number(electricity_curr),
      water_prev: water_curr !== undefined && water_curr !== null ? water_prev : null,
      water_curr: water_curr !== undefined && water_curr !== null ? Number(water_curr) : null,
      electricity_unit_price: electricity_unit_price !== undefined ? Number(electricity_unit_price) : 3500,
      water_unit_price: water_unit_price !== undefined ? Number(water_unit_price) : WATER_PRICE_PER_PERSON,
      soNguoiO: final_soNguoiO,
      recorded_by: userId
    }
  });
};

// ==========================================
// INVOICES (HÓA ĐƠN)
// ==========================================

export const getInvoices = async ({ page = 1, limit = 20, status, contract_id, billing_month, apartment_id }) => {
  const where = {};
  if (status) where.status = status;
  if (contract_id) where.contract_id = contract_id;
  if (billing_month) where.billing_month = billing_month;
  if (apartment_id) where.apartment_id = apartment_id;

  const [items, total] = await Promise.all([
    prisma.invoices.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        contract: {
          include: {
            tenant: { select: { id: true, full_name: true, phone: true } }
          }
        },
        apartment: { select: { id: true, apartment_code: true } },
        creator: { select: { id: true, full_name: true } }
      }
    }),
    prisma.invoices.count({ where })
  ]);

  return { items, total, page, limit };
};

export const getInvoiceById = async (id) => {
  return prisma.invoices.findUnique({
    where: { id },
    include: {
      contract: {
        include: {
          tenant: true,
          service_subscriptions: {
            where: { status: 'ACTIVE' },
            include: {
              service: true
            }
          }
        }
      },
      apartment: {
        include: {
          floor: {
            include: {
              building: true
            }
          }
        }
      },
      creator: { select: { id: true, full_name: true } },
      payments: {
        orderBy: { created_at: 'desc' },
        include: {
          recorder: { select: { id: true, full_name: true } }
        }
      }
    }
  });
};

/**
 * Tính ngày hạn thanh toán dựa trên billing_month và payment_due_day.
 * due_date = payment_due_day của tháng KẾ TIẾP billing_month.
 * Ví dụ: billingMonth="2026-05", paymentDueDay=5 → 2026-06-05
 * Edge case: paymentDueDay=31, tháng 2 → lấy ngày cuối tháng (28 hoặc 29)
 */
function calcDueDate(billingMonth, paymentDueDay) {
  const [year, month] = billingMonth.split('-').map(Number);

  let dueYear = year;
  let dueMonth = month + 1;
  if (dueMonth > 12) {
    dueMonth = 1;
    dueYear += 1;
  }

  // Xử lý edge case: payment_due_day vượt quá số ngày trong tháng
  const lastDayOfDueMonth = new Date(dueYear, dueMonth, 0).getDate();
  const actualDueDay = Math.min(paymentDueDay, lastDayOfDueMonth);

  return new Date(dueYear, dueMonth - 1, actualDueDay);
}

export const generateInvoice = async (data, userId) => {
  const { contract_id, billing_month, other_amount = 0 } = data;

  if (!contract_id || !billing_month) {
    throw new Error('Thiếu hợp đồng hoặc tháng thanh toán để lập hóa đơn');
  }

  // Validate format YYYY-MM
  if (!/^\d{4}-\d{2}$/.test(billing_month)) {
    throw new Error('Định dạng tháng thanh toán không hợp lệ (yêu cầu YYYY-MM)');
  }

  // Check unique contract_id + billing_month
  const existing = await prisma.invoices.findUnique({
    where: {
      contract_id_billing_month: {
        contract_id,
        billing_month
      }
    }
  });

  if (existing) {
    throw new Error(`Hóa đơn cho hợp đồng này trong tháng ${billing_month} đã tồn tại`);
  }

  // Fetch contract
  const contract = await prisma.contracts.findUnique({
    where: { id: contract_id },
    include: {
      apartment: true,
      service_subscriptions: {
        where: { status: 'ACTIVE' },
        include: {
          service: true
        }
      }
    }
  });

  if (!contract) {
    throw new Error('Không tìm thấy hợp đồng');
  }

  if (!['ACTIVE', 'EXPIRING_SOON'].includes(contract.status)) {
    throw new Error('Chỉ có thể tạo hóa đơn cho hợp đồng đang hoạt động');
  }

  // Get utility reading
  const utilityReading = await prisma.utilityReadings.findUnique({
    where: {
      apartment_id_billing_month: {
        apartment_id: contract.apartment_id,
        billing_month
      }
    }
  });

  if (!utilityReading) {
    throw new Error(`Chưa có chỉ số điện nước cho căn hộ ${contract.apartment.apartment_code} trong tháng ${billing_month}. Vui lòng ghi nhận chỉ số điện nước trước.`);
  }

  // Calculate costs
  const rent_amount = Number(contract.monthly_rent);

  const electricity_usage = Number(utilityReading.electricity_curr) - Number(utilityReading.electricity_prev);
  const electricity_amount = electricity_usage * Number(utilityReading.electricity_unit_price);

  if (!contract.soNguoiO || contract.soNguoiO <= 0) {
    throw new Error(`Hợp đồng ${contract.contract_code} chưa cấu hình Số người ở hoặc bằng 0. Không thể tạo hóa đơn.`);
  }

  const water_amount = contract.water_price_per_month ? Number(contract.water_price_per_month) : calculateWaterCost(contract.soNguoiO);

  let service_amount = 0;
  for (const sub of contract.service_subscriptions) {
    service_amount += Number(sub.quantity) * Number(sub.service.unit_price);
  }

  const other = Number(other_amount);
  const total_amount = rent_amount + electricity_amount + water_amount + service_amount + other;

  // Generate unique invoice_code
  const cleanCode = contract.contract_code.replace(/-/g, '');
  const monthCode = billing_month.replace('-', '');
  const invoice_code = `HD-${cleanCode}-${monthCode}`;

  // Check unique invoice_code
  const checkCode = await prisma.invoices.findUnique({ where: { invoice_code } });
  if (checkCode) {
    throw new Error(`Mã hóa đơn ${invoice_code} đã tồn tại`);
  }

  // Due date: ngày payment_due_day của tháng KẾ TIẾP billing_month
  const due_date = calcDueDate(billing_month, contract.payment_due_day || 5);

  return prisma.invoices.create({
    data: {
      invoice_code,
      contract_id,
      apartment_id: contract.apartment_id,
      billing_month,
      rent_amount,
      electricity_amount,
      water_amount,
      service_amount,
      other_amount: other,
      total_amount,
      status: 'UNPAID',
      due_date,
      created_by: userId
    }
  });
};

export const updateInvoiceStatus = async (id, status) => {
  const validStatuses = ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'];
  if (!validStatuses.includes(status)) {
    throw new Error('Trạng thái hóa đơn không hợp lệ');
  }

  const invoice = await prisma.invoices.findUnique({ where: { id } });
  if (!invoice) {
    throw new Error('Không tìm thấy hóa đơn');
  }

  return prisma.invoices.update({
    where: { id },
    data: { status }
  });
};

// ==========================================
// PAYMENTS (THANH TOÁN / THU TIỀN)
// ==========================================

export const recordPayment = async (data, userId) => {
  const { invoice_id, amount, payment_method, payment_date, reference_number, note } = data;

  if (!invoice_id || amount === undefined || !payment_method || !payment_date) {
    throw new Error('Thiếu thông tin thanh toán bắt buộc');
  }

  if (Number(amount) <= 0) {
    throw new Error('Số tiền thanh toán phải lớn hơn 0');
  }

  const payment = await prisma.$transaction(async (tx) => {
    // 1. Fetch invoice
    const invoice = await tx.invoices.findUnique({
      where: { id: invoice_id }
    });

    if (!invoice) {
      throw new Error('Không tìm thấy hóa đơn');
    }

    if (invoice.status === 'PAID') {
      throw new Error('Hóa đơn này đã được thanh toán đầy đủ');
    }

    // 2. Create payment record
    const payment = await tx.payments.create({
      data: {
        invoice_id,
        amount: Number(amount),
        payment_method,
        payment_date: new Date(payment_date),
        reference_number,
        note,
        recorded_by: userId
      }
    });

    // 3. Re-calculate paid sum
    const allPayments = await tx.payments.findMany({
      where: { invoice_id }
    });

    const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalAmount = Number(invoice.total_amount);
    const isPastDue = new Date(invoice.due_date) < new Date();

    let status = 'UNPAID';
    if (totalPaid >= totalAmount) {
      status = 'PAID';
    } else if (totalPaid > 0) {
      status = isPastDue ? 'OVERDUE' : 'PARTIALLY_PAID';
    } else {
      status = isPastDue ? 'OVERDUE' : 'UNPAID';
    }

    await tx.invoices.update({
      where: { id: invoice_id },
      data: { status }
    });

    return payment;
  });

  // Gửi thông báo tới Admin và Manager
  (async () => {
    try {
      const managers = await prisma.users.findMany({
        where: { role: { in: ['ADMIN', 'MANAGER'] }, is_active: true },
        select: { id: true }
      });
      
      const invoice = await prisma.invoices.findUnique({
        where: { id: invoice_id },
        include: { apartment: { select: { apartment_code: true } } }
      });

      const aptCode = invoice?.apartment?.apartment_code ?? '';

      for (const manager of managers) {
        await createNotification({
          userId: manager.id,
          title: 'Đã nhận thanh toán',
          message: `Căn hộ ${aptCode}: Nhận thanh toán ${Number(amount).toLocaleString('vi-VN')} đ cho hóa đơn ${invoice?.invoice_code}.`,
          type: 'PAYMENT_RECEIVED',
          entityType: 'Invoice',
          entityId: invoice_id
        });
      }
    } catch (err) {
      console.error('[Notification] Failed to send payment notification:', err.message);
    }
  })();

  return payment;
};

// ==========================================
// EXCEL UTILITY BULK IMPORT & TEMPLATE
// ==========================================

export const getUtilityTemplateBuffer = async () => {
  const activeContracts = await prisma.contracts.findMany({
    where: {
      status: { in: ['ACTIVE', 'EXPIRING_SOON'] },
      deleted_at: null
    },
    include: {
      apartment: true
    }
  });

  const currentMonth = new Date().toISOString().substring(0, 7); // e.g., "2026-06"

  const data = [];
  for (const contract of activeContracts) {
    // Find latest reading
    const latestReading = await prisma.utilityReadings.findFirst({
      where: { apartment_id: contract.apartment_id },
      orderBy: { billing_month: 'desc' }
    });

    const electricity_prev = latestReading ? Number(latestReading.electricity_curr) : Number(contract.initial_electricity);

    data.push({
      'Mã Căn Hộ': contract.apartment.apartment_code,
      'Tháng Thanh Toán (YYYY-MM)': currentMonth,
      'Chỉ Số Điện Cũ (Tham khảo - Không sửa)': electricity_prev,
      'Chỉ Số Điện Mới (kWh)': '',
      'Đơn Giá Điện (VND - Tùy chọn)': Number(contract.electricity_price),
      'Đơn Giá Nước (VND - Tùy chọn)': WATER_PRICE_PER_PERSON
    });
  }

  // Fallback to sample data if no active contracts
  if (data.length === 0) {
    data.push({
      'Mã Căn Hộ': 'A.101',
      'Tháng Thanh Toán (YYYY-MM)': currentMonth,
      'Chỉ Số Điện Cũ (Tham khảo - Không sửa)': 100,
      'Chỉ Số Điện Mới (kWh)': 150,
      'Đơn Giá Điện (VND - Tùy chọn)': 3500,
      'Đơn Giá Nước (VND - Tùy chọn)': WATER_PRICE_PER_PERSON
    });
  }

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(data);
  xlsx.utils.book_append_sheet(wb, ws, 'Template');
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

export const bulkImportUtilities = async (fileBuffer, userId) => {
  const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('File Excel không có sheet nào');
  }
  const sheet = workbook.Sheets[sheetName];
  const rawRows = xlsx.utils.sheet_to_json(sheet);
  if (rawRows.length === 0) {
    throw new Error('File Excel không chứa dữ liệu hoặc trống');
  }

  const results = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const rowNum = i + 2; // header is row 1, data starts at row 2

    let apartment_code = '';
    let billing_month = '';
    let electricity_curr = undefined;
    let water_curr = null;
    let electricity_unit_price = undefined;
    let water_unit_price = undefined;

    for (const key of Object.keys(row)) {
      const cleanKey = key.trim().toLowerCase();
      const val = row[key];
      if (cleanKey.includes('căn hộ') || cleanKey.includes('apartment') || cleanKey.includes('phòng')) {
        apartment_code = String(val).trim();
      } else if (cleanKey.includes('tháng') || cleanKey.includes('month')) {
        billing_month = String(val).trim();
      } else if (cleanKey.includes('điện mới') || cleanKey.includes('electricity') || cleanKey.includes('số điện')) {
        electricity_curr = val;
      } else if (cleanKey.includes('nước mới') || cleanKey.includes('water') || cleanKey.includes('số nước')) {
        water_curr = val;
      } else if (cleanKey.includes('đơn giá điện') || cleanKey.includes('electricity price')) {
        electricity_unit_price = val;
      } else if (cleanKey.includes('đơn giá nước') || cleanKey.includes('water price')) {
        water_unit_price = val;
      }
    }

    try {
      if (!apartment_code) throw new Error('Thiếu mã căn hộ');
      if (!billing_month) throw new Error('Thiếu tháng thanh toán');
      if (electricity_curr === undefined || electricity_curr === '') throw new Error('Thiếu chỉ số điện mới');

      if (!/^\d{4}-\d{2}$/.test(billing_month)) {
        throw new Error('Tháng thanh toán không hợp lệ (yêu cầu định dạng YYYY-MM)');
      }

      const apartment = await prisma.apartments.findUnique({
        where: { apartment_code }
      });
      if (!apartment) {
        throw new Error(`Căn hộ "${apartment_code}" không tồn tại trong hệ thống`);
      }

      // Check active contract
      const activeContract = await prisma.contracts.findFirst({
        where: {
          apartment_id: apartment.id,
          status: { in: ['ACTIVE', 'EXPIRING_SOON'] }
        }
      });
      if (!activeContract) {
        throw new Error(`Căn hộ "${apartment_code}" hiện đang trống hoặc không có hợp đồng thuê hoạt động`);
      }

      // Unique billing month check
      const existing = await prisma.utilityReadings.findUnique({
        where: {
          apartment_id_billing_month: {
            apartment_id: apartment.id,
            billing_month
          }
        }
      });
      if (existing) {
        throw new Error(`Căn hộ đã được ghi nhận chỉ số tháng ${billing_month} trước đó`);
      }

      // Find previous reading
      const prevReading = await prisma.utilityReadings.findFirst({
        where: {
          apartment_id: apartment.id,
          billing_month: { lt: billing_month }
        },
        orderBy: { billing_month: 'desc' }
      });

      const electricity_prev = prevReading ? Number(prevReading.electricity_curr) : 0;
      const water_prev = prevReading && prevReading.water_curr !== null ? Number(prevReading.water_curr) : null;

      if (Number(electricity_curr) < electricity_prev) {
        throw new Error(`Chỉ số điện mới (${electricity_curr}) nhỏ hơn số điện cũ (${electricity_prev})`);
      }

      if (water_curr !== undefined && water_curr !== null && water_curr !== '' && water_prev !== null) {
        if (Number(water_curr) < water_prev) {
          throw new Error(`Chỉ số nước mới (${water_curr}) nhỏ hơn số nước cũ (${water_prev})`);
        }
      }

      const final_water_curr = water_curr !== undefined && water_curr !== null && water_curr !== '' ? Number(water_curr) : null;
      const final_water_prev = final_water_curr !== null ? (water_prev !== null ? water_prev : 0) : null;

      const soNguoiO = activeContract.soNguoiO || 1;

      await prisma.utilityReadings.create({
        data: {
          apartment_id: apartment.id,
          billing_month,
          electricity_prev,
          electricity_curr: Number(electricity_curr),
          water_prev: final_water_prev,
          water_curr: final_water_curr,
          electricity_unit_price: electricity_unit_price !== undefined && electricity_unit_price !== '' ? Number(electricity_unit_price) : 3500,
          water_unit_price: water_unit_price !== undefined && water_unit_price !== '' ? Number(water_unit_price) : WATER_PRICE_PER_PERSON,
          soNguoiO,
          recorded_by: userId
        }
      });

      results.push({
        row: rowNum,
        apartment_code,
        billing_month,
        status: 'SUCCESS',
        message: 'Ghi nhận thành công'
      });
      successCount++;
    } catch (err) {
      results.push({
        row: rowNum,
        apartment_code: apartment_code || 'Chưa rõ',
        billing_month: billing_month || 'Chưa rõ',
        status: 'ERROR',
        message: err.message
      });
      errorCount++;
    }
  }

  return {
    totalRows: rawRows.length,
    successCount,
    errorCount,
    results
  };
};

export const importPreview = async (fileBuffer) => {
  const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('File Excel không có sheet nào');
  }
  const sheet = workbook.Sheets[sheetName];
  const rawRows = xlsx.utils.sheet_to_json(sheet);
  if (rawRows.length === 0) {
    throw new Error('File Excel không chứa dữ liệu hoặc trống');
  }

  const list = [];
  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const rowNum = i + 2;

    let apartment_code = '';
    let billing_month = '';
    let electricity_curr = undefined;
    let electricity_unit_price = undefined;
    let water_unit_price = undefined;

    for (const key of Object.keys(row)) {
      const cleanKey = key.trim().toLowerCase();
      const val = row[key];
      if (cleanKey.includes('căn hộ') || cleanKey.includes('apartment') || cleanKey.includes('phòng')) {
        apartment_code = String(val).trim();
      } else if (cleanKey.includes('tháng') || cleanKey.includes('month')) {
        billing_month = String(val).trim();
      } else if (cleanKey.includes('điện mới') || cleanKey.includes('electricity') || cleanKey.includes('chỉ số điện mới') || cleanKey.includes('số điện new')) {
        electricity_curr = val !== undefined && val !== '' ? Number(val) : undefined;
      } else if (cleanKey.includes('đơn giá điện') || cleanKey.includes('electricity price')) {
        electricity_unit_price = val !== undefined && val !== '' ? Number(val) : undefined;
      } else if (cleanKey.includes('đơn giá nước') || cleanKey.includes('water price')) {
        water_unit_price = val !== undefined && val !== '' ? Number(val) : undefined;
      }
    }

    let isValid = true;
    let error = null;
    let apartment = null;
    let activeContract = null;
    let electricity_prev = 0;
    let soNguoiO = 1;

    try {
      if (!apartment_code) throw new Error('Thiếu mã căn hộ');
      if (!billing_month) throw new Error('Thiếu tháng thanh toán');
      if (electricity_curr === undefined || isNaN(electricity_curr)) throw new Error('Thiếu hoặc sai định dạng chỉ số điện mới');

      if (!/^\d{4}-\d{2}$/.test(billing_month)) {
        throw new Error('Tháng thanh toán không hợp lệ (yêu cầu định dạng YYYY-MM)');
      }

      apartment = await prisma.apartments.findUnique({
        where: { apartment_code }
      });
      if (!apartment) {
        throw new Error(`Căn hộ "${apartment_code}" không tồn tại trong hệ thống`);
      }

      activeContract = await prisma.contracts.findFirst({
        where: {
          apartment_id: apartment.id,
          status: { in: ['ACTIVE', 'EXPIRING_SOON'] }
        }
      });
      if (!activeContract) {
        throw new Error(`Căn hộ "${apartment_code}" hiện đang trống hoặc không có hợp đồng thuê hoạt động`);
      }

      soNguoiO = activeContract.soNguoiO || 1;

      // Unique billing month check
      const existing = await prisma.utilityReadings.findUnique({
        where: {
          apartment_id_billing_month: {
            apartment_id: apartment.id,
            billing_month
          }
        }
      });
      if (existing) {
        throw new Error(`Căn hộ đã được ghi nhận chỉ số tháng ${billing_month} trước đó`);
      }

      // Find previous reading
      const prevReading = await prisma.utilityReadings.findFirst({
        where: {
          apartment_id: apartment.id,
          billing_month: { lt: billing_month }
        },
        orderBy: { billing_month: 'desc' }
      });

      electricity_prev = prevReading ? Number(prevReading.electricity_curr) : Number(activeContract.initial_electricity);

      if (electricity_curr < electricity_prev) {
        throw new Error(`Chỉ số điện mới (${electricity_curr}) nhỏ hơn số điện cũ (${electricity_prev})`);
      }

      electricity_unit_price = electricity_unit_price !== undefined ? electricity_unit_price : Number(activeContract.electricity_price);
      water_unit_price = water_unit_price !== undefined ? water_unit_price : WATER_PRICE_PER_PERSON;
    } catch (err) {
      isValid = false;
      error = err.message;
    }

    list.push({
      row: rowNum,
      apartment_id: apartment?.id || null,
      apartment_code,
      billing_month,
      electricity_prev,
      electricity_curr: electricity_curr !== undefined ? electricity_curr : '',
      electricity_unit_price: electricity_unit_price || 3500,
      water_unit_price: water_unit_price || WATER_PRICE_PER_PERSON,
      soNguoiO,
      isValid,
      error
    });
  }

  return list;
};

export const bulkSaveUtilities = async (readings, userId) => {
  let successCount = 0;
  let errorCount = 0;
  const results = [];

  for (let i = 0; i < readings.length; i++) {
    const r = readings[i];
    try {
      if (!r.apartment_id) throw new Error('Căn hộ không hợp lệ');
      if (!r.billing_month) throw new Error('Thiếu tháng thanh toán');
      if (r.electricity_curr === undefined || r.electricity_curr === '') throw new Error('Thiếu chỉ số điện mới');

      // Double check in DB to avoid race conditions
      const existing = await prisma.utilityReadings.findUnique({
        where: {
          apartment_id_billing_month: {
            apartment_id: Number(r.apartment_id),
            billing_month: r.billing_month
          }
        }
      });
      if (existing) {
        throw new Error(`Đã ghi nhận chỉ số tháng ${r.billing_month}`);
      }

      await prisma.utilityReadings.create({
        data: {
          apartment_id: Number(r.apartment_id),
          billing_month: r.billing_month,
          electricity_prev: Number(r.electricity_prev || 0),
          electricity_curr: Number(r.electricity_curr),
          water_prev: null,
          water_curr: null,
          electricity_unit_price: Number(r.electricity_unit_price || 3500),
          water_unit_price: Number(r.water_unit_price || WATER_PRICE_PER_PERSON),
          soNguoiO: Number(r.soNguoiO || 1),
          recorded_by: userId
        }
      });

      successCount++;
      results.push({
        apartment_code: r.apartment_code,
        status: 'SUCCESS',
        message: 'Lưu thành công'
      });
    } catch (err) {
      errorCount++;
      results.push({
        apartment_code: r.apartment_code || 'Chưa rõ',
        status: 'ERROR',
        message: err.message
      });
    }
  }

  return {
    successCount,
    errorCount,
    results
  };
};
