import { prisma, notDeleted } from '@my/prisma';
import eventHub from '@my/events';
import { validateTransition } from '@my/workflow-backend';
import { applyBuildingScope, getAssignedBuildingIds } from '@my/policy-backend';

const INCLUDE_FULL = {
  assignee: { select: { id: true, full_name: true, role: true } },
  apartment: {
    select: {
      id: true,
      apartment_code: true,
      floor: { select: { floor_number: true, building: { select: { id: true, name: true } } } }
    }
  },
  contract: {
    select: {
      id: true,
      contract_code: true,
      tenant: { select: { id: true, full_name: true } }
    }
  },
  asset: {
    select: {
      id: true,
      asset_code: true,
      name: true
    }
  },
  expenses: true,
  materials_used: {
    include: {
      inventory_item: { select: { id: true, item_name: true, unit: true } }
    }
  }
};

// GET / — Tất cả yêu cầu (ADMIN/MANAGER)
export const getAll = async (filters = {}, currentUser) => {
  let where = { ...notDeleted };
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
    ? { assigned_to: userId, ...notDeleted }
    : { ...notDeleted };

  where = await applyBuildingScope(currentUser, where, 'ServiceRequest');

  return prisma.serviceRequests.findMany({
    where,
    include: INCLUDE_FULL,
    orderBy: { created_at: 'desc' },
  });
};

// GET /:id — Chi tiết
export const getById = async (id) => {
  return prisma.serviceRequests.findFirst({
    where: { id, ...notDeleted },
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

  if (data.asset_id) {
    const asset = await prisma.assets.findUnique({ where: { id: Number(data.asset_id) } });
    if (!asset) throw new Error('Không tìm thấy tài sản cố định');
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
      asset_id: data.asset_id ? Number(data.asset_id) : null,
      type: data.type || 'MAINTENANCE',
      priority: data.priority || 'NORMAL',
      status: data.status || 'PENDING',
      source: data.source || 'INTERNAL',
      requester_name: requesterName,
      requester_phone: requesterPhone,
      assigned_to: data.assigned_to ? Number(data.assigned_to) : null,
      scheduled_start_date: data.scheduled_start_date ? new Date(data.scheduled_start_date) : new Date(),
      created_by: requestedByUserId,
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
      status: 'ASSIGNED',
      updated_by: actorId
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

  const updateData = { status, updated_by: requesterId };
  if (status === 'RESOLVED') {
    updateData.resolved_at = new Date();
  } else {
    updateData.resolved_at = null;
  }

  const eventsToEmit = [];

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

    // Nếu truyền vật tư sử dụng khi hoàn thành sự cố (RESOLVED)
    if (status === 'RESOLVED' && Array.isArray(body.materials)) {
      for (const mat of body.materials) {
        const itemId = Number(mat.inventory_item_id);
        const qty = Number(mat.quantity);
        if (qty <= 0) continue;

        const item = await tx.inventoryItems.findUnique({
          where: { id: itemId },
          include: { warehouse: true }
        });
        if (!item) throw new Error(`Vật tư #${itemId} không tồn tại trong kho`);

        const result = await tx.inventoryItems.updateMany({
          where: { id: itemId, current_stock: { gte: qty } },
          data: { current_stock: { decrement: qty } }
        });

        if (result.count === 0) {
          throw new Error(`Vật tư '${item.item_name}' không đủ số lượng tồn kho (yêu cầu: ${qty}, hiện có: ${item.current_stock})`);
        }

        await tx.serviceRequestMaterials.create({
          data: {
            service_request_id: id,
            inventory_item_id: itemId,
            quantity: qty,
            unit_cost: item.unit_cost
          }
        });

        const transaction = await tx.stockTransactions.create({
          data: {
            inventory_item_id: itemId,
            type: 'STOCK_OUT',
            quantity: qty,
            unit_cost: item.unit_cost,
            item_name_snapshot: item.item_name,
            ref_type: 'SERVICE_REQUEST',
            ref_id: id,
            note: `Xuất kho vật tư xử lý sự cố kỹ thuật #${id}`,
            recorded_by: requesterId
          }
        });

        const updatedStock = item.current_stock - qty;

        if (updatedStock <= item.min_stock_level) {
          eventsToEmit.push({
            type: 'inventory.low_stock',
            payload: {
              entityId: itemId,
              actorId: requesterId,
              data: {
                itemId,
                itemName: item.item_name,
                currentStock: updatedStock,
                minStockLevel: item.min_stock_level,
                buildingId: item.warehouse.building_id
              }
            }
          });
        }

        eventsToEmit.push({
          type: 'inventory.stock_out',
          payload: {
            entityId: transaction.id,
            actorId: requesterId,
            data: {
              itemId,
              itemName: item.item_name,
              quantity: qty,
              unitCost: Number(item.unit_cost),
              type: 'STOCK_OUT',
              refType: 'SERVICE_REQUEST',
              refId: id
            }
          }
        });
      }
    }

    return tx.serviceRequests.update({
      where: { id },
      data: updateData,
      include: INCLUDE_FULL,
    });
  });

  // Phát các sự kiện thu thập được sau khi transaction thành công
  for (const evt of eventsToEmit) {
    eventHub.emit(evt.type, evt.payload);
  }

  // Gửi thông báo và log timeline bằng cách phát sự kiện qua EventHub
  if (status === 'RESOLVED') {
    eventHub.emit('maintenance.completed', {
      actorId: requesterId,
      entityId: updated.id,
      data: {
        title: updated.title,
        oldData: { status: sr.status },
        newData: { status: updated.status },
        expenses: updated.expenses,
        materials: updated.materials_used
      }
    });
  }

  return updated;
};
