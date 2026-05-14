import { prisma } from '@my/prisma';

// Helper: Sinh mã hợp đồng
const generateContractCode = async () => {
  const year = new Date().getFullYear();
  const lastContract = await prisma.contracts.findFirst({
    where: { contract_code: { startsWith: `HD${year}-` } },
    orderBy: { id: 'desc' },
  });
  
  const seq = lastContract
    ? parseInt(lastContract.contract_code.split('-')[1]) + 1
    : 1;
    
  return `HD${year}-${String(seq).padStart(4, '0')}`;
};

export const getContracts = async ({ page = 1, limit = 20, status, apartment_id, tenant_id }) => {
  const where = {};
  if (status) where.status = status;
  if (apartment_id) where.apartment_id = apartment_id;
  if (tenant_id) where.tenant_id = tenant_id;

  const [items, total] = await Promise.all([
    prisma.contracts.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        tenant: { select: { id: true, full_name: true, national_id: true } },
        apartment: { select: { id: true, apartment_code: true } },
      },
    }),
    prisma.contracts.count({ where }),
  ]);

  return { items, total, page, limit };
};

export const getContractById = async (id) => {
  return prisma.contracts.findUnique({
    where: { id },
    include: {
      tenant: true,
      apartment: {
        include: { floor: { include: { building: true } } },
      },
      creator: { select: { full_name: true } },
    },
  });
};

export const createContract = async (data, userId) => {
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);

  if (endDate <= startDate) {
    throw new Error('Ngày kết thúc phải lớn hơn ngày bắt đầu');
  }

  if (data.payment_due_day < 1 || data.payment_due_day > 28) {
    throw new Error('Ngày hạn thanh toán (payment_due_day) phải từ ngày 1 đến 28');
  }

  // 1. Kiểm tra trạng thái căn hộ
  const apartment = await prisma.apartments.findUnique({ where: { id: data.apartment_id } });
  if (!apartment) throw new Error('Không tìm thấy căn hộ');
  
  if (!['AVAILABLE', 'RESERVED'].includes(apartment.status)) {
    throw new Error(`Không thể ký hợp đồng, căn hộ đang ở trạng thái ${apartment.status}`);
  }

  // 2. Kiểm tra không có hợp đồng ACTIVE trùng căn hộ
  const activeContract = await prisma.contracts.findFirst({
    where: { apartment_id: data.apartment_id, status: 'ACTIVE' },
  });
  if (activeContract) {
    throw new Error('Căn hộ này đang có hợp đồng hiệu lực khác');
  }

  // 3. Thực hiện Transaction
  const contractCode = await generateContractCode();

  const [newContract] = await prisma.$transaction([
    prisma.contracts.create({
      data: {
        ...data,
        start_date: startDate,
        end_date: endDate,
        contract_code: contractCode,
        created_by: userId,
        status: 'ACTIVE',
      },
    }),
    prisma.apartments.update({
      where: { id: data.apartment_id },
      data: { status: 'OCCUPIED' },
    }),
    prisma.apartmentStatusLogs.create({
      data: {
        apartment_id: data.apartment_id,
        old_status: apartment.status,
        new_status: 'OCCUPIED',
        changed_by: userId,
        reason: `Hợp đồng ${contractCode} được ký kết`,
      },
    }),
  ]);

  return newContract;
};

export const updateContract = async (id, data) => {
  // Không cho phép sửa status, apartment_id, tenant_id qua đây
  const { status, apartment_id, tenant_id, contract_code, ...updateData } = data;
  
  if (updateData.start_date) updateData.start_date = new Date(updateData.start_date);
  if (updateData.end_date) updateData.end_date = new Date(updateData.end_date);

  return prisma.contracts.update({
    where: { id },
    data: updateData,
  });
};

export const terminateContract = async (id, termination_reason, userId) => {
  const contract = await prisma.contracts.findUnique({ where: { id } });
  if (!contract) throw new Error('Không tìm thấy hợp đồng');
  
  if (contract.status === 'TERMINATED' || contract.status === 'EXPIRED') {
    throw new Error(`Hợp đồng đã ở trạng thái ${contract.status}, không thể chấm dứt`);
  }

  const [terminatedContract] = await prisma.$transaction([
    prisma.contracts.update({
      where: { id },
      data: { status: 'TERMINATED', termination_reason },
    }),
    prisma.apartments.update({
      where: { id: contract.apartment_id },
      data: { status: 'AVAILABLE' },
    }),
    prisma.apartmentStatusLogs.create({
      data: {
        apartment_id: contract.apartment_id,
        old_status: 'OCCUPIED',
        new_status: 'AVAILABLE',
        changed_by: userId,
        reason: `Hợp đồng ${contract.contract_code} chấm dứt sớm`,
      },
    }),
  ]);

  return terminatedContract;
};

export const renewContract = async (id, data, userId) => {
  const contract = await prisma.contracts.findUnique({ where: { id } });
  if (!contract) throw new Error('Không tìm thấy hợp đồng');

  if (!['ACTIVE', 'EXPIRING_SOON'].includes(contract.status)) {
    throw new Error('Chỉ được gia hạn hợp đồng đang ở trạng thái ACTIVE hoặc EXPIRING_SOON');
  }

  const newEndDate = new Date(data.new_end_date);
  if (newEndDate <= contract.end_date) {
    throw new Error('Ngày kết thúc mới phải lớn hơn ngày kết thúc hiện tại của hợp đồng');
  }

  const [renewedContract] = await prisma.$transaction([
    prisma.contractRenewals.create({
      data: {
        contract_id: id,
        old_end_date: contract.end_date,
        new_end_date: newEndDate,
        new_monthly_rent: data.new_monthly_rent ?? contract.monthly_rent,
        notes: data.notes,
        renewed_by: userId,
      },
    }),
    prisma.contracts.update({
      where: { id },
      data: {
        end_date: newEndDate,
        monthly_rent: data.new_monthly_rent ?? contract.monthly_rent,
        status: 'ACTIVE', // Reset về ACTIVE nếu đang là EXPIRING_SOON
      },
    }),
  ]);

  return renewedContract;
};

export const getRenewals = async (contractId) => {
  return prisma.contractRenewals.findMany({
    where: { contract_id: contractId },
    orderBy: { renewed_at: 'desc' },
    include: {
      user: { select: { full_name: true } },
    },
  });
};

export const getExpiringSoon = async () => {
  // Logic đếm số ngày còn lại xử lý ở frontend hoặc map thêm ở đây
  const contracts = await prisma.contracts.findMany({
    where: { status: 'EXPIRING_SOON' },
    orderBy: { end_date: 'asc' },
    include: {
      tenant: { select: { full_name: true, phone: true } },
      apartment: { select: { apartment_code: true } },
    },
  });

  const today = new Date();
  
  return contracts.map(c => {
    const timeDiff = c.end_date.getTime() - today.getTime();
    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return {
      ...c,
      days_left: daysLeft >= 0 ? daysLeft : 0,
    };
  });
};
