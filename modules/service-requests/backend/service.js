import { prisma } from '@my/prisma';
import { createNotification } from '@my/notifications-backend/service';

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
export const getAll = async (filters = {}) => {
  const where = {};
  if (filters.status) where.status = filters.status;
  if (filters.assigned_to) where.assigned_to = Number(filters.assigned_to);
  if (filters.apartment_id) where.apartment_id = Number(filters.apartment_id);

  return prisma.serviceRequests.findMany({
    where,
    include: INCLUDE_FULL,
    orderBy: { created_at: 'desc' },
  });
};

// GET /my — Yêu cầu của user hiện tại (TECHNICIAN xem việc được giao + RECEPTIONIST xem việc do mình tạo)
export const getMy = async (userId, role) => {
  const where = role === 'TECHNICIAN'
    ? { assigned_to: userId }
    : {};

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
export const create = async (data, requestedByUserId) => {
  let requesterName = data.requester_name;
  let requesterPhone = data.requester_phone;
  if (!requesterName && requestedByUserId) {
    const user = await prisma.users.findUnique({ where: { id: requestedByUserId } });
    if (user) {
      requesterName = user.full_name;
      requesterPhone = user.phone;
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

  return prisma.serviceRequests.create({
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
    },
    include: INCLUDE_FULL,
  });
};

// PATCH /:id/assign — Assign cho kỹ thuật viên
export const assign = async (id, assignedTo) => {
  // Validate assignee
  const user = await prisma.users.findUnique({ where: { id: assignedTo } });
  if (!user) throw new Error('Nhân viên không tồn tại');

  const updated = await prisma.serviceRequests.update({
    where: { id },
    data: { 
      assigned_to: assignedTo,
      status: 'ASSIGNED'
    },
    include: INCLUDE_FULL,
  });

  // Gửi thông báo real-time tới kỹ thuật viên
  await createNotification({
    userId: assignedTo,
    title: 'Yêu cầu kỹ thuật mới',
    message: `Bạn được phân công xử lý yêu cầu: "${updated.title}"`,
    type: 'MAINTENANCE_ASSIGNED',
    entityType: 'ServiceRequest',
    entityId: updated.id,
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

  const validStatuses = ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED', 'POSTPONED'];
  if (!validStatuses.includes(status)) {
    throw new Error('Trạng thái không hợp lệ');
  }

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

  // Gửi thông báo real-time khi hoàn thành sự cố (Kỹ thuật viên -> ADMIN/MANAGER)
  if (status === 'RESOLVED') {
    (async () => {
      try {
        const managers = await prisma.users.findMany({
          where: { role: { in: ['ADMIN', 'MANAGER'] }, is_active: true },
          select: { id: true }
        });

        // Tính tổng chi phí
        const totalCost = updated.expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
        const aptCode = updated.apartment?.apartment_code ?? '';

        // Tên kỹ thuật viên xử lý
        const techName = requesterRole === 'TECHNICIAN'
          ? (await prisma.users.findUnique({ where: { id: requesterId }, select: { full_name: true } }))?.full_name
          : 'Nhân viên';

        for (const manager of managers) {
          await createNotification({
            userId: manager.id,
            title: 'Sự cố kỹ thuật đã hoàn thành',
            message: `Căn hộ ${aptCode}: Yêu cầu "${updated.title}" đã được hoàn thành bởi ${techName}. Tổng chi phí: ${totalCost.toLocaleString('vi-VN')} đ.`,
            type: 'MAINTENANCE_RESOLVED',
            entityType: 'ServiceRequest',
            entityId: updated.id
          });
        }
      } catch (err) {
        console.error('[Notification] Failed to send maintenance resolved notification:', err.message);
      }
    })();
  }

  return updated;
};
