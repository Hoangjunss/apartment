import { prisma } from '@my/prisma';
import eventHub from '@my/events';
import { validateTransition } from '@my/workflow-backend';
import { applyBuildingScope, getAssignedBuildingIds } from '@my/policy-backend';

const INCLUDE_FULL = {
  assignee: { select: { id: true, full_name: true, role: true } },
  apartment: {
    select: {
      id: true,
      apartment_code: true,
      floor: { select: { floor_number: true, building: { select: { name: true } } } }
    }
  },
  contract: {
    select: {
      id: true,
      contract_code: true,
      tenant: { select: { id: true, full_name: true } }
    }
  },
  expenses: true
};

// GET / — Tất cả yêu cầu (ADMIN/MANAGER)
export const getAll = async (filters = {}, currentUser) => {
  let where = {};
  if (filters.status) where.status = filters.status;
  if (filters.assigned_to) where.assigned_to = Number(filters.assigned_to);
  if (filters.apartment_id) where.apartment_id = Number(filters.apartment_id);

  where = await applyBuildingScope(currentUser, where, 'ServiceRequest');

  return prisma.serviceRequests.findMany({
    where,
    include: INCLUDE_FULL,
    orderBy: { created_at: 'desc' },
  });
};

// GET /my — Yêu cầu của user hiện tại (TECHNICIAN xem việc được giao + RECEPTIONIST xem việc do mình tạo)
export const getMy = async (userId, role, currentUser) => {
  let where = role === 'TECHNICIAN'
    ? { assigned_to: userId }
    : {};

  where = await applyBuildingScope(currentUser, where, 'ServiceRequest');

  return prisma.serviceRequests.findMany({
    where,
    include: INCLUDE_FULL,
    orderBy: { created_at: 'desc' },
  });
};

// GET /:id — Chi tiết
export const getById = async (id) => {
  return prisma.serviceRequests.findUnique({
    where: { id },
    include: INCLUDE_FULL,
  });
};

// POST / — Tạo mới
export const create = async (data, requestedByUserId, currentUser) => {
  let requesterName = data.requester_name;
  let requesterPhone = data.requester_phone;
  if (!requesterName && requestedByUserId) {
    const user = await prisma.users.findUnique({ where: { id: requestedByUserId } });
    if (user) {
      requesterName = user.full_name;
      requesterPhone = user.phone;
    }
  }

  // Check policy gán tòa nhà đối với role MANAGER/TECHNICIAN/RECEPTIONIST
  const apartment = await prisma.apartments.findUnique({
    where: { id: Number(data.apartment_id) },
    include: { floor: true }
  });
  if (!apartment) throw new Error('Không tìm thấy căn hộ');

  if (currentUser && currentUser.role !== 'ADMIN') {
    const assignedIds = await getAssignedBuildingIds(currentUser.userId);
    if (!assignedIds.includes(apartment.floor.building_id)) {
      throw new Error(`Bạn không có quyền gửi yêu cầu cho căn hộ thuộc tòa nhà này (Tòa nhà #${apartment.floor.building_id})`);
    }
  }

  let contractId = data.contract_id ? Number(data.contract_id) : null;
  if (!contractId && data.apartment_id) {
    const activeContract = await prisma.contracts.findFirst({
      where: {
        apartment_id: Number(data.apartment_id),
        status: 'ACTIVE'
      }
    });
    if (activeContract) {
      contractId = activeContract.id;
    }
  }

  const newRequest = await prisma.serviceRequests.create({
    data: {
      title: data.title,
      description: data.description,
      apartment_id: Number(data.apartment_id),
      contract_id: contractId,
      type: data.type || 'MAINTENANCE',
      priority: data.priority || 'NORMAL',
      status: data.status || 'PENDING',
      source: data.source || 'INTERNAL',
      requester_name: requesterName,
      requester_phone: requesterPhone,
      assigned_to: data.assigned_to ? Number(data.assigned_to) : null,
      scheduled_start_date: data.scheduled_start_date ? new Date(data.scheduled_start_date) : new Date(),
    },
    include: INCLUDE_FULL,
  });

  eventHub.emit('maintenance.created', {
    actorId: requestedByUserId,
    entityId: newRequest.id,
    data: { title: newRequest.title, priority: newRequest.priority, status: newRequest.status }
  });

  return newRequest;
};

// PATCH /:id/assign — Assign cho kỹ thuật viên
export const assign = async (id, assignedTo, actorId) => {
  // Validate assignee
  const user = await prisma.users.findUnique({ where: { id: assignedTo } });
  if (!user) throw new Error('Nhân viên không tồn tại');

  const oldRequest = await prisma.serviceRequests.findUnique({ where: { id } });

  const updated = await prisma.serviceRequests.update({
    where: { id },
    data: { 
      assigned_to: assignedTo,
      status: 'ASSIGNED'
    },
    include: INCLUDE_FULL,
  });

  eventHub.emit('maintenance.assigned', {
    actorId,
    entityId: updated.id,
    data: {
      oldData: { status: oldRequest?.status, assigned_to: oldRequest?.assigned_to },
      newData: { status: updated.status, assigned_to: updated.assigned_to },
      assignedTo,
      title: updated.title
    }
  });

  return updated;
};

// PATCH /:id/status — Cập nhật trạng thái
// TECHNICIAN chỉ được cập nhật việc được giao cho mình
export const updateStatus = async (id, status, requesterId, requesterRole, body = {}) => {
  const sr = await prisma.serviceRequests.findUnique({ where: { id } });
  if (!sr) throw new Error('Yêu cầu không tồn tại');

  // TECHNICIAN: chỉ được update việc được assign cho mình
  if (requesterRole === 'TECHNICIAN' && sr.assigned_to !== requesterId) {
    throw new Error('Bạn chỉ có thể cập nhật yêu cầu được giao cho mình');
  }

  // Xác thực transition trạng thái qua Workflow Engine
  await validateTransition('ServiceRequestWorkflow', sr.status, status, requesterRole);

  const updateData = { status };
  if (status === 'RESOLVED') {
    updateData.resolved_at = new Date();
  } else {
    updateData.resolved_at = null;
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Nếu truyền danh sách chi phí dạng mảng, thực hiện cập nhật ghi đè chi phí cho sự cố
    if (Array.isArray(body.expenses)) {
      // Xóa chi phí cũ trước
      await tx.serviceRequestExpenses.deleteMany({
        where: { service_request_id: id }
      });

      // Tạo chi phí mới nếu có
      const expenseData = body.expenses
        .filter(exp => exp.description && exp.description.trim() && exp.amount !== undefined)
        .map(exp => ({
          service_request_id: id,
          description: exp.description.trim(),
          amount: Number(exp.amount)
        }));

      if (expenseData.length > 0) {
        await tx.serviceRequestExpenses.createMany({
          data: expenseData
        });
      }
    }

    return tx.serviceRequests.update({
      where: { id },
      data: updateData,
      include: INCLUDE_FULL,
    });
  });

  // Gửi thông báo và log timeline bằng cách phát sự kiện qua EventHub
  if (status === 'RESOLVED') {
    eventHub.emit('maintenance.completed', {
      actorId: requesterId,
      entityId: updated.id,
      data: {
        title: updated.title,
        oldData: { status: sr.status },
        newData: { status: updated.status },
        expenses: updated.expenses
      }
    });
  }

  return updated;
};
