import { prisma, Prisma } from '@my/prisma';
import eventHub from '@my/events';
import { WATER_PRICE_PER_PERSON } from './constants.js';
import { calculateWaterCost } from './utils.js';
import xlsx from 'xlsx';
import { applyBuildingScope } from '@my/policy-backend';

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

export const getInvoices = async ({ page = 1, limit = 20, status, contract_id, billing_month, apartment_id }, currentUser) => {
  let where = {};
  if (status) where.status = status;
  if (contract_id) where.contract_id = contract_id;
  if (billing_month) where.billing_month = billing_month;
  if (apartment_id) where.apartment_id = apartment_id;

  where = await applyBuildingScope(currentUser, where, 'Invoice');

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

  return prisma.$transaction(async (tx) => {
    // Check unique contract_id + billing_month
    const existing = await tx.invoices.findUnique({
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
    const contract = await tx.contracts.findUnique({
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
    const utilityReading = await tx.utilityReadings.findUnique({
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

    // 1. Quét nợ cũ (Debt Rollover)
    const unpaidInvoices = await tx.invoices.findMany({
      where: {
        contract_id,
        status: { in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] },
        billing_month: { lt: billing_month }
      },
      include: {
        payments: true
      },
      orderBy: { billing_month: 'asc' }
    });

    let debt_amount = 0;
    for (const oldInv of unpaidInvoices) {
      const paymentsSum = oldInv.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const remaining = Number(oldInv.total_amount) - Number(oldInv.credit_applied) - paymentsSum;
      if (remaining > 0) {
        debt_amount += remaining;
        
        const currentNote = oldInv.note ? `${oldInv.note}\n` : '';
        await tx.invoices.update({
          where: { id: oldInv.id },
          data: {
            status: 'PAID',
            note: `${currentNote}[Cộng dồn nợ] Nợ cũ ${remaining.toLocaleString('vi-VN')} đ được chuyển tiếp sang hóa đơn tháng ${billing_month}.`
          }
        });
      }
    }

    // 2. Quét Credit (Ví dư)
    const creditRecord = await tx.contractCredits.findUnique({
      where: { contract_id }
    });
    let availableCredit = creditRecord ? Number(creditRecord.balance) : 0;

    // Calculate base total amount & final total amount (including rolled over debt)
    const base_total = rent_amount + electricity_amount + water_amount + service_amount + other;
    const total_amount = base_total + debt_amount;

    let credit_applied = 0;
    if (availableCredit > 0) {
      if (availableCredit >= total_amount) {
        credit_applied = total_amount;
        availableCredit -= total_amount;
      } else {
        credit_applied = availableCredit;
        availableCredit = 0;
      }
    }

    // Generate unique invoice_code
    const cleanCode = contract.contract_code.replace(/-/g, '');
    const monthCode = billing_month.replace('-', '');
    const invoice_code = `HD-${cleanCode}-${monthCode}`;

    // Check unique invoice_code
    const checkCode = await tx.invoices.findUnique({ where: { invoice_code } });
    if (checkCode) {
      throw new Error(`Mã hóa đơn ${invoice_code} đã tồn tại`);
    }

    const due_date = calcDueDate(billing_month, contract.payment_due_day || 5);

    // Determine status
    let status = 'UNPAID';
    if (credit_applied >= total_amount) {
      status = 'PAID';
    }

    // Create invoice
    const newInvoiceRecord = await tx.invoices.create({
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
        debt_amount,
        credit_applied,
        total_amount,
        status,
        due_date,
        created_by: userId
      }
    });

    // Update credit wallet if credit was applied
    if (credit_applied > 0) {
      await tx.contractCredits.update({
        where: { contract_id },
        data: { balance: availableCredit }
      });

      // Log credit transaction
      await tx.creditTransactions.create({
        data: {
          contract_id,
          invoice_id: newInvoiceRecord.id,
          type: 'CREDIT_APPLY',
          amount: credit_applied,
          description: `Khấu trừ tự động tiền dư vào hóa đơn tháng ${billing_month} (Số tiền: ${credit_applied.toLocaleString('vi-VN')} đ)`,
          recorded_by: userId
        }
      });
    }

    return newInvoiceRecord;
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable
  });

  eventHub.emit('invoice.created', {
    actorId: userId,
    entityId: newInvoice.id,
    data: {
      invoice_code: newInvoice.invoice_code,
      billing_month: newInvoice.billing_month,
      total_amount: newInvoice.total_amount
    }
  });

  return newInvoice;
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

  const { paymentRecord, creditSurplus } = await prisma.$transaction(async (tx) => {
    // 1. Fetch invoice and related payments
    const invoice = await tx.invoices.findUnique({
      where: { id: invoice_id },
      include: { payments: true }
    });

    if (!invoice) {
      throw new Error('Không tìm thấy hóa đơn');
    }

    if (invoice.status === 'PAID') {
      throw new Error('Hóa đơn này đã được thanh toán đầy đủ');
    }

    const paymentsSumBefore = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = Number(invoice.total_amount) - Number(invoice.credit_applied) - paymentsSumBefore;

    if (remaining <= 0) {
      throw new Error('Hóa đơn này đã được thanh toán đầy đủ hoặc khấu trừ hết bằng credit');
    }

    const amountInput = Number(amount);
    let amountAppliedToInvoice = amountInput;
    let creditSurplus = 0;

    if (amountInput > remaining) {
      amountAppliedToInvoice = remaining;
      creditSurplus = amountInput - remaining;
    }

    // 2. Create payment record (capped at remaining)
    const paymentRecord = await tx.payments.create({
      data: {
        invoice_id,
        amount: amountAppliedToInvoice,
        payment_method,
        payment_date: new Date(payment_date),
        reference_number,
        note: note || (creditSurplus > 0 ? `Thanh toán hóa đơn. Thừa ${creditSurplus.toLocaleString('vi-VN')} đ chuyển vào ví credit.` : undefined),
        recorded_by: userId
      }
    });

    // 3. If there is surplus, add to contract credits and write a transaction
    if (creditSurplus > 0) {
      await tx.contractCredits.upsert({
        where: { contract_id: invoice.contract_id },
        update: {
          balance: { increment: creditSurplus }
        },
        create: {
          contract_id: invoice.contract_id,
          balance: creditSurplus
        }
      });

      await tx.creditTransactions.create({
        data: {
          contract_id: invoice.contract_id,
          invoice_id: invoice.id,
          payment_id: paymentRecord.id,
          type: 'CREDIT_IN',
          amount: creditSurplus,
          description: `Nạp tiền dư từ thanh toán hóa đơn ${invoice.invoice_code} (Thực nộp: ${amountInput.toLocaleString('vi-VN')} đ, Thanh toán: ${amountAppliedToInvoice.toLocaleString('vi-VN')} đ)`,
          recorded_by: userId
        }
      });
    }

    // 4. Update invoice status
    const totalPaid = paymentsSumBefore + amountAppliedToInvoice;
    const totalAmount = Number(invoice.total_amount);
    const isPastDue = new Date(invoice.due_date) < new Date();

    let status = 'UNPAID';
    if (totalPaid + Number(invoice.credit_applied) >= totalAmount) {
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

    return { paymentRecord, creditSurplus };
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable
  });

  // Phát sự kiện invoice.paid qua EventHub
  const invoiceAfterPayment = await prisma.invoices.findUnique({
    where: { id: invoice_id }
  });

  eventHub.emit('invoice.paid', {
    actorId: userId,
    entityId: invoice_id,
    data: {
      invoiceCode: invoiceAfterPayment?.invoice_code,
      billingMonth: invoiceAfterPayment?.billing_month,
      paymentAmount: paymentRecord.amount,
      paymentMethod: payment_method,
      newStatus: invoiceAfterPayment?.status,
      contractId: invoiceAfterPayment?.contract_id
    }
  });

  return paymentRecord;
};

// Credits service functions
export const getContractCreditDetails = async (contractId) => {
  const credit = await prisma.contractCredits.findUnique({
    where: { contract_id: contractId }
  });
  
  const transactions = await prisma.creditTransactions.findMany({
    where: { contract_id: contractId },
    orderBy: { created_at: 'desc' },
    include: {
      invoice: { select: { invoice_code: true } },
      payment: { select: { id: true, reference_number: true } },
      recorder: { select: { id: true, full_name: true } }
    }
  });

  return {
    balance: credit ? Number(credit.balance) : 0,
    transactions
  };
};

export const refundContractCredit = async (data, userId) => {
  const { contract_id, amount, note } = data;

  if (Number(amount) <= 0) {
    throw new Error('Số tiền hoàn trả phải lớn hơn 0');
  }

  return prisma.$transaction(async (tx) => {
    const credit = await tx.contractCredits.findUnique({
      where: { contract_id }
    });

    const currentBalance = credit ? Number(credit.balance) : 0;
    if (currentBalance < Number(amount)) {
      throw new Error(`Số dư ví credit (${currentBalance.toLocaleString('vi-VN')} đ) không đủ để hoàn trả ${Number(amount).toLocaleString('vi-VN')} đ`);
    }

    // Update balance
    const updatedCredit = await tx.contractCredits.update({
      where: { contract_id },
      data: {
        balance: { decrement: Number(amount) }
      }
    });

    // Create transaction log
    const txLog = await tx.creditTransactions.create({
      data: {
        contract_id,
        type: 'CREDIT_REFUND',
        amount: Number(amount),
        description: note || 'Hoàn tiền ví credit cho khách hàng',
        recorded_by: userId
      }
    });

    return { credit: updatedCredit, transaction: txLog };
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable
  });
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
