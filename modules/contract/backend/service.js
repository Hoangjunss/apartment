import { prisma } from '@my/prisma';

export const getContracts = async ({ status, apartment_id, tenant_id }) => {
  const where = {};
  if (status) where.status = status;
  if (apartment_id) where.apartment_id = parseInt(apartment_id);
  if (tenant_id) where.tenant_id = parseInt(tenant_id);

  return prisma.contracts.findMany({
    where,
    orderBy: { created_at: 'desc' },
    include: {
      tenant: true,
      apartment: {
        include: {
          floor: {
            include: { building: true }
          }
        }
      }
    }
  });
};

export const getContractById = async (id) => {
  const contract = await prisma.contracts.findUnique({
    where: { id: parseInt(id) },
    include: {
      tenant: true,
      apartment: {
        include: {
          floor: {
            include: { building: true }
          }
        }
      },
      creator: {
        select: {
          id: true,
          full_name: true,
          email: true,
          role: true
        }
      }
    }
  });
  if (!contract) throw new Error('Không tìm thấy hợp đồng');
  return contract;
};

export const getExpiringSoon = async () => {
  const today = new Date();
  const in30Days = new Date();
  in30Days.setDate(today.getDate() + 30);

  // Lấy danh sách hợp đồng có status là EXPIRING_SOON hoặc đang ACTIVE nhưng lọt vào tầm 30 ngày
  const contracts = await prisma.contracts.findMany({
    where: {
      status: { in: ['ACTIVE', 'EXPIRING_SOON'] },
      end_date: {
        lte: in30Days,
        gte: today
      }
    },
    include: {
      tenant: true,
      apartment: {
        include: {
          floor: {
            include: { building: true }
          }
        }
      }
    },
    orderBy: { end_date: 'asc' }
  });

  return contracts.map(c => {
    const diffTime = Math.abs(new Date(c.end_date) - today);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return {
      ...c,
      days_left: diffDays
    };
  });
};

const generateContractCode = async () => {
  const year = new Date().getFullYear();
  const lastContract = await prisma.contracts.findFirst({
    where: { contract_code: { startsWith: `HD${year}-` } },
    orderBy: { id: 'desc' }
  });
  const seq = lastContract
    ? parseInt(lastContract.contract_code.split('-')[1]) + 1
    : 1;
  return `HD${year}-${String(seq).padStart(4, '0')}`;
};

export const createContract = async (data, userId) => {
  const aptId = parseInt(data.apartment_id);
  const tId = parseInt(data.tenant_id);
  const creatorId = parseInt(userId);

  const paymentDueDay = parseInt(data.payment_due_day);
  if (isNaN(paymentDueDay) || paymentDueDay < 1 || paymentDueDay > 28) {
    throw new Error('Ngày thanh toán hàng tháng (payment_due_day) phải từ 1 đến 28');
  }

  // 1. Kiểm tra căn hộ
  const apartment = await prisma.apartments.findUnique({
    where: { id: aptId }
  });
  if (!apartment) throw new Error('Không tìm thấy căn hộ');

  if (apartment.status !== 'AVAILABLE' && apartment.status !== 'RESERVED') {
    throw new Error(`Căn hộ đang ở trạng thái ${apartment.status}, không thể làm hợp đồng mới`);
  }

  // 2. Kiểm tra căn hộ có contract active trùng lịch không
  const activeContract = await prisma.contracts.findFirst({
    where: {
      apartment_id: aptId,
      status: { in: ['ACTIVE', 'EXPIRING_SOON'] }
    }
  });
  if (activeContract) {
    throw new Error('Căn hộ này hiện đang có một hợp đồng hoạt động');
  }

  const contractCode = await generateContractCode();

  const [newContract] = await prisma.$transaction([
    // 1. Tạo hợp đồng
    prisma.contracts.create({
      data: {
        contract_code: contractCode,
        tenant_id: tId,
        apartment_id: aptId,
        start_date: new Date(data.start_date),
        end_date: new Date(data.end_date),
        monthly_rent: data.monthly_rent,
        deposit_amount: data.deposit_amount,
        payment_due_day: paymentDueDay,
        notes: data.notes,
        created_by: creatorId,
        status: 'ACTIVE'
      }
    }),
    // 2. Đổi trạng thái căn hộ sang OCCUPIED
    prisma.apartments.update({
      where: { id: aptId },
      data: { status: 'OCCUPIED' }
    }),
    // 3. Ghi status log cho căn hộ
    prisma.apartmentStatusLogs.create({
      data: {
        apartment_id: aptId,
        old_status: apartment.status,
        new_status: 'OCCUPIED',
        changed_by: creatorId,
        reason: `Ký kết hợp đồng thuê ${contractCode}`
      }
    })
  ]);

  return newContract;
};

export const updateContract = async (id, data) => {
  const contractId = parseInt(id);
  const contract = await prisma.contracts.findUnique({
    where: { id: contractId }
  });
  if (!contract) throw new Error('Không tìm thấy hợp đồng');

  // Chỉ cho phép cập nhật một số trường phụ
  return prisma.contracts.update({
    where: { id: contractId },
    data: {
      notes: data.notes,
      payment_due_day: data.payment_due_day ? parseInt(data.payment_due_day) : undefined
    }
  });
};

export const terminateContract = async (id, terminationReason, userId) => {
  const contractId = parseInt(id);
  const changerId = parseInt(userId);

  const contract = await prisma.contracts.findUnique({
    where: { id: contractId }
  });
  if (!contract) throw new Error('Không tìm thấy hợp đồng');

  if (contract.status === 'TERMINATED' || contract.status === 'EXPIRED') {
    throw new Error('Hợp đồng đã kết thúc hoặc đã chấm dứt trước đó');
  }

  const [updatedContract] = await prisma.$transaction([
    // 1. Chuyển trạng thái hợp đồng sang TERMINATED
    prisma.contracts.update({
      where: { id: contractId },
      data: {
        status: 'TERMINATED',
        termination_reason: terminationReason || 'Thanh lý hợp đồng sớm'
      }
    }),
    // 2. Đổi trạng thái căn hộ về AVAILABLE
    prisma.apartments.update({
      where: { id: contract.apartment_id },
      data: { status: 'AVAILABLE' }
    }),
    // 3. Ghi status log cho căn hộ
    prisma.apartmentStatusLogs.create({
      data: {
        apartment_id: contract.apartment_id,
        old_status: 'OCCUPIED',
        new_status: 'AVAILABLE',
        changed_by: changerId,
        reason: `Chấm dứt hợp đồng ${contract.contract_code} sớm. Lý do: ${terminationReason || 'Không có'}`
      }
    })
  ]);

  return updatedContract;
};

export const renewContract = async (id, data, userId) => {
  const contractId = parseInt(id);
  const changerId = parseInt(userId);

  const contract = await prisma.contracts.findUnique({
    where: { id: contractId }
  });
  if (!contract) throw new Error('Không tìm thấy hợp đồng');

  if (contract.status !== 'ACTIVE' && contract.status !== 'EXPIRING_SOON') {
    throw new Error('Chỉ có thể gia hạn hợp đồng đang hoạt động hoặc sắp hết hạn');
  }

  const newEndDate = new Date(data.new_end_date);
  if (newEndDate <= new Date(contract.end_date)) {
    throw new Error('Ngày kết thúc mới phải lớn hơn ngày kết thúc hiện tại của hợp đồng');
  }

  const [renewalRecord, updatedContract] = await prisma.$transaction([
    // 1. Ghi nhận lịch sử gia hạn
    prisma.contractRenewals.create({
      data: {
        contract_id: contractId,
        old_end_date: contract.end_date,
        new_end_date: newEndDate,
        new_monthly_rent: data.new_monthly_rent || contract.monthly_rent,
        notes: data.notes,
        renewed_by: changerId
      }
    }),
    // 2. Cập nhật hợp đồng
    prisma.contracts.update({
      where: { id: contractId },
      data: {
        end_date: newEndDate,
        monthly_rent: data.new_monthly_rent || contract.monthly_rent,
        status: 'ACTIVE'
      }
    })
  ]);

  return updatedContract;
};

export const getRenewals = async (contractId) => {
  return prisma.contractRenewals.findMany({
    where: { contract_id: parseInt(contractId) },
    orderBy: { created_at: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          full_name: true,
          email: true,
          role: true
        }
      }
    }
  });
};
