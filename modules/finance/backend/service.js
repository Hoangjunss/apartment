import { prisma } from '@my/prisma';

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
        apartment: { select: { id: true, apartment_code: true } },
        recorder: { select: { id: true, full_name: true } }
      }
    }),
    prisma.utilityReadings.count({ where })
  ]);

  return { items, total, page, limit };
};

export const recordUtilityReading = async (data, userId) => {
  const { apartment_id, billing_month, electricity_curr, water_curr, electricity_unit_price, water_unit_price } = data;

  if (!apartment_id || !billing_month || electricity_curr === undefined || water_curr === undefined) {
    throw new Error('Thiếu thông tin ghi nhận số điện nước bắt buộc');
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
  const water_prev = prevReading ? Number(prevReading.water_curr) : 0;

  if (Number(electricity_curr) < electricity_prev) {
    throw new Error(`Chỉ số điện mới (${electricity_curr}) không được nhỏ hơn chỉ số điện cũ (${electricity_prev})`);
  }

  if (Number(water_curr) < water_prev) {
    throw new Error(`Chỉ số nước mới (${water_curr}) không được nhỏ hơn chỉ số nước cũ (${water_prev})`);
  }

  return prisma.utilityReadings.create({
    data: {
      apartment_id,
      billing_month,
      electricity_prev,
      electricity_curr: Number(electricity_curr),
      water_prev,
      water_curr: Number(water_curr),
      electricity_unit_price: electricity_unit_price !== undefined ? Number(electricity_unit_price) : 3500,
      water_unit_price: water_unit_price !== undefined ? Number(water_unit_price) : 15000,
      recorded_by: userId
    }
  });
};

// ==========================================
// INVOICES (HÓA ĐƠN)
// ==========================================

export const getInvoices = async ({ page = 1, limit = 20, status, contract_id, billing_month }) => {
  const where = {};
  if (status) where.status = status;
  if (contract_id) where.contract_id = contract_id;
  if (billing_month) where.billing_month = billing_month;

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

  const water_usage = Number(utilityReading.water_curr) - Number(utilityReading.water_prev);
  const water_amount = water_usage * Number(utilityReading.water_unit_price);

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

  // Due date: set to contract.payment_due_day of billing_month or next month if day is invalid
  const [year, month] = billing_month.split('-').map(Number);
  const dueDay = contract.payment_due_day || 5;
  // standard js month is 0-indexed
  let due_date = new Date(year, month - 1, dueDay);
  if (isNaN(due_date.getTime())) {
    due_date = new Date();
    due_date.setDate(due_date.getDate() + 7);
  }

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

  return prisma.$transaction(async (tx) => {
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

    let status = 'UNPAID';
    if (totalPaid >= totalAmount) {
      status = 'PAID';
    } else if (totalPaid > 0) {
      status = 'PARTIALLY_PAID';
    }

    await tx.invoices.update({
      where: { id: invoice_id },
      data: { status }
    });

    return payment;
  });
};
