import { prisma } from '@my/prisma';

const INCLUDE_FULL = {
  requester: { select: { id: true, full_name: true, role: true } },
  assignee: { select: { id: true, full_name: true, role: true } },
  apartment: {
    select: {
      id: true,
      apartment_code: true,
      floor: { select: { floor_number: true, building: { select: { name: true } } } }
    }
  }
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
    : { requested_by: userId };

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
export const create = async (data, requestedBy) => {
  return prisma.serviceRequests.create({
    data: {
      title: data.title,
      description: data.description,
      apartment_id: data.apartment_id ? Number(data.apartment_id) : null,
      requested_by: requestedBy,
      status: 'PENDING',
    },
    include: INCLUDE_FULL,
  });
};

// PATCH /:id/assign — Assign cho kỹ thuật viên
export const assign = async (id, assignedTo) => {
  // Validate assignee là TECHNICIAN
  const user = await prisma.users.findUnique({ where: { id: assignedTo } });
  if (!user) throw new Error('Nhân viên không tồn tại');

  return prisma.serviceRequests.update({
    where: { id },
    data: { assigned_to: assignedTo },
    include: INCLUDE_FULL,
  });
};

// PATCH /:id/status — Cập nhật trạng thái
// TECHNICIAN chỉ được cập nhật việc được giao cho mình
export const updateStatus = async (id, status, requesterId, requesterRole) => {
  const sr = await prisma.serviceRequests.findUnique({ where: { id } });
  if (!sr) throw new Error('Yêu cầu không tồn tại');

  // TECHNICIAN: chỉ được update việc được assign cho mình
  if (requesterRole === 'TECHNICIAN' && sr.assigned_to !== requesterId) {
    throw new Error('Bạn chỉ có thể cập nhật yêu cầu được giao cho mình');
  }

  const validStatuses = ['PENDING', 'IN_PROGRESS', 'RESOLVED'];
  if (!validStatuses.includes(status)) {
    throw new Error('Trạng thái không hợp lệ');
  }

  return prisma.serviceRequests.update({
    where: { id },
    data: { status },
    include: INCLUDE_FULL,
  });
};
