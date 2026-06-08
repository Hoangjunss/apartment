import { prisma, notDeleted } from '@my/prisma';
import eventHub from '@my/events';
import { validateTransition } from '@my/workflow-backend';
import { applyBuildingScope, getAssignedBuildingIds } from '@my/policy-backend';


// Helper: Sinh mã hợp đồng
const generateContractCode = async () => {
  const year = new Date().getFullYear();
  const lastContract = await prisma.contracts.findFirst({
    where: { contract_code: { startsWith: `HD${year}-` }, ...notDeleted },
    orderBy: { id: 'desc' },
  });
  
  const seq = lastContract
    ? parseInt(lastContract.contract_code.split('-')[1]) + 1
    : 1;
    
  return `HD${year}-${String(seq).padStart(4, '0')}`;
};

export const getContracts = async ({ page = 1, limit = 20, status, apartment_id, tenant_id, building_id, month }, currentUser) => {
  let where = {
    ...notDeleted
  };
  if (status) where.status = status;
  if (apartment_id) where.apartment_id = apartment_id;
  if (tenant_id) where.tenant_id = tenant_id;

  if (building_id) {
    where.apartment = {
      floor: {
        building_id: building_id,
        ...notDeleted
      },
      ...notDeleted
    };
  }

  if (month) {
    const [yStr, mStr] = month.split('-');
    const year = Number(yStr);
    const m = Number(mStr);
    const startOfMonth = new Date(year, m - 1, 1);
    const endOfMonth = new Date(year, m, 0, 23, 59, 59, 999);
    
    where.start_date = { lte: endOfMonth };
    where.end_date = { gte: startOfMonth };
  }

  // Áp dụng Building Scope dựa trên phân quyền người dùng
  where = await applyBuildingScope(currentUser, where, 'Contract');

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
  return prisma.contracts.findFirst({
    where: { id, ...notDeleted },
    include: {
      tenant: true,
      apartment: {
        include: { floor: { include: { building: true } } },
      },
      creator: { select: { full_name: true } },
    },
  });
};

export const createContract = async (data, userId, currentUser) => {
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);

  if (endDate <= startDate) {
    throw new Error('Ngày kết thúc phải lớn hơn ngày bắt đầu');
  }

  if (data.payment_due_day < 1 || data.payment_due_day > 28) {
    throw new Error('Ngày hạn thanh toán (payment_due_day) phải từ ngày 1 đến 28');
  }

  // 1. Kiểm tra trạng thái căn hộ
  const apartment = await prisma.apartments.findFirst({
    where: { id: data.apartment_id, ...notDeleted },
    include: { floor: true }
  });
  if (!apartment) throw new Error('Không tìm thấy căn hộ');

  // Check policy gán tòa nhà đối với role MANAGER/TECHNICIAN/RECEPTIONIST
  if (currentUser && currentUser.role !== 'ADMIN') {
    const assignedIds = await getAssignedBuildingIds(currentUser.userId);
    if (!assignedIds.includes(apartment.floor.building_id)) {
      throw new Error(`Bạn không có quyền quản lý tòa nhà chứa căn hộ này (Tòa nhà #${apartment.floor.building_id})`);
    }
  }
  
  if (!['AVAILABLE', 'RESERVED'].includes(apartment.status)) {
    throw new Error(`Không thể ký hợp đồng, căn hộ đang ở trạng thái ${apartment.status}`);
  }

  // 2. Kiểm tra không có hợp đồng ACTIVE trùng căn hộ
  const activeContract = await prisma.contracts.findFirst({
    where: { apartment_id: data.apartment_id, status: 'ACTIVE', ...notDeleted },
  });
  if (activeContract) {
    throw new Error('Căn hộ này đang có hợp đồng hiệu lực khác');
  }

  const occupants_count = data.occupants_count ? Number(data.occupants_count) : 1;
  const water_price_per_month = data.water_price_per_month ? Number(data.water_price_per_month) : 100000;
  const initial_electricity = data.initial_electricity ? Number(data.initial_electricity) : 0;
  const electricity_price = data.electricity_price ? Number(data.electricity_price) : 3500;
  const initial_water = data.initial_water != null && data.initial_water !== '' ? Number(data.initial_water) : null;
  const termination_notice_days = data.termination_notice_days ? Number(data.termination_notice_days) : 30;
  const furniture_handover = data.furniture_handover || null;

  // 3. Thực hiện Transaction
  const contractCode = await generateContractCode();

  const [newContract] = await prisma.$transaction([
    prisma.contracts.create({
      data: {
        tenant_id: Number(data.tenant_id),
        apartment_id: Number(data.apartment_id),
        start_date: startDate,
        end_date: endDate,
        monthly_rent: Number(data.monthly_rent),
        deposit_amount: Number(data.deposit_amount),
        payment_due_day: Number(data.payment_due_day),
        notes: data.notes || null,
        contract_code: contractCode,
        created_by: userId,
        status: 'ACTIVE',
        
        occupants_count,
        soNguoiO: occupants_count,
        water_price_per_month,
        initial_electricity,
        electricity_price,
        initial_water,
        furniture_handover,
        termination_notice_days,
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

  eventHub.emit('contract.created', {
    actorId: userId,
    entityId: newContract.id,
    data: { contract_code: contractCode, tenant_id: data.tenant_id, apartment_id: data.apartment_id, start_date: startDate },
  });

  return newContract;
};

export const updateContract = async (id, data, actor) => {

  // Không cho phép sửa status, apartment_id, tenant_id qua đây
  const { status, apartment_id, tenant_id, contract_code, ...updateData } = data;
  
  if (updateData.start_date) updateData.start_date = new Date(updateData.start_date);
  if (updateData.end_date) updateData.end_date = new Date(updateData.end_date);

  if (updateData.occupants_count !== undefined && updateData.occupants_count !== null) {
    updateData.soNguoiO = Number(updateData.occupants_count);
  }

  const oldContract = await prisma.contracts.findFirst({ where: { id, ...notDeleted } });

  const updated = await prisma.contracts.update({
    where: { id },
    data: {
      ...updateData,
      updated_by: actor?.userId
    },
  });

  if (actor && oldContract) {
    const oldData = {};
    const newData = {};
    for (const key of Object.keys(updateData)) {
      if (key === 'start_date' || key === 'end_date') {
        oldData[key] = oldContract[key] ? new Date(oldContract[key]).toISOString().split('T')[0] : null;
        newData[key] = updated[key] ? new Date(updated[key]).toISOString().split('T')[0] : null;
      } else {
        oldData[key] = oldContract[key];
        newData[key] = updated[key];
      }
    }
    eventHub.emit('contract.updated', {
      actorId: actor.userId,
      entityId: id,
      data: { oldData, newData }
    });
  }

  return updated;
};

export const terminateContract = async (id, termination_reason, userId, userRole) => {
  const contract = await prisma.contracts.findFirst({ where: { id, ...notDeleted } });
  if (!contract) throw new Error('Không tìm thấy hợp đồng');
  
  // Xác thực transition trạng thái qua Workflow Engine
  await validateTransition('ContractWorkflow', contract.status, 'TERMINATED', userRole);

  const [terminatedContract] = await prisma.$transaction([
    prisma.contracts.update({
      where: { id },
      data: { status: 'TERMINATED', termination_reason, updated_by: userId },
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

  eventHub.emit('contract.terminated', {
    actorId: userId,
    entityId: id,
    data: {
      oldData: { status: contract.status, contract_code: contract.contract_code },
      newData: { status: 'TERMINATED', termination_reason }
    }
  });

  return terminatedContract;
};

export const renewContract = async (id, data, userId, userRole) => {
  const contract = await prisma.contracts.findFirst({ where: { id, ...notDeleted } });
  if (!contract) throw new Error('Không tìm thấy hợp đồng');

  // Xác thực transition trạng thái qua Workflow Engine
  await validateTransition('ContractWorkflow', contract.status, 'ACTIVE', userRole);

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
        updated_by: userId
      },
    }),
  ]);

  eventHub.emit('contract.renewed', {
    actorId: userId,
    entityId: id,
    data: {
      oldData: {
        end_date: contract.end_date ? new Date(contract.end_date).toISOString().split('T')[0] : null,
        monthly_rent: contract.monthly_rent,
        status: contract.status,
      },
      newData: {
        end_date: newEndDate.toISOString().split('T')[0],
        monthly_rent: data.new_monthly_rent ?? contract.monthly_rent,
        status: 'ACTIVE',
      },
      new_end_date: newEndDate,
      new_monthly_rent: data.new_monthly_rent ?? contract.monthly_rent
    }
  });

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

export const getExpiringSoon = async (currentUser) => {
  let where = { status: 'EXPIRING_SOON', ...notDeleted };
  where = await applyBuildingScope(currentUser, where, 'Contract');

  const contracts = await prisma.contracts.findMany({
    where,
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
