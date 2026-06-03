import { prisma } from '@my/prisma';

/**
 * Tạo một audit log entry.
 * Được gọi từ các service khác sau mỗi thao tác nghiệp vụ.
 *
 * @param {object} params
 * @param {number} params.actorId      - ID của người thực hiện
 * @param {string} params.actorName    - Tên người thực hiện (snapshot tại thời điểm action)
 * @param {string} params.action       - CREATE | UPDATE | DELETE
 * @param {string} params.resourceType - Contract | Tenant | Invoice | Payment | Apartment | Building
 * @param {number} [params.resourceId] - ID của bản ghi bị tác động
 * @param {object} [params.oldData]    - Dữ liệu trước khi thay đổi
 * @param {object} [params.newData]    - Dữ liệu sau khi thay đổi
 * @param {string} [params.ipAddress]  - IP address của client
 */
export const createLog = async ({
  actorId,
  actorName,
  action,
  resourceType,
  resourceId = null,
  oldData = null,
  newData = null,
  ipAddress = null,
}) => {
  try {
    const data = {
      action,
      resource_type: resourceType,
      resource_id: resourceId ? Number(resourceId) : null,
      old_data: oldData,
      new_data: newData,
      ip_address: ipAddress,
    };

    if (actorId) {
      data.actor_id = Number(actorId);
      let resolvedActorName = actorName;
      if (!resolvedActorName) {
        const user = await prisma.users.findUnique({
          where: { id: Number(actorId) },
          select: { full_name: true },
        });
        if (user) {
          resolvedActorName = user.full_name;
        }
      }
      data.actor_name = resolvedActorName || `User #${actorId}`;
    } else {
      data.actor_id = 0;
      data.actor_name = actorName || 'Hệ thống';
    }

    await prisma.auditLogs.create({ data });
  } catch (err) {
    // Lỗi audit log không được làm fail request chính
    console.error('[AuditLog] Failed to write log:', err.message);
  }
};

/**
 * Lấy audit history cho một resource cụ thể (Contract, Tenant, Apartment, etc.)
 * Extensible: chỉ cần truyền resourceType và resourceId.
 */
export const getAuditHistory = async (resourceType, resourceId, { page = 1, limit = 20 } = {}) => {
  const [items, total] = await Promise.all([
    prisma.auditLogs.findMany({
      where: { resource_type: resourceType, resource_id: Number(resourceId) },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLogs.count({
      where: { resource_type: resourceType, resource_id: Number(resourceId) },
    }),
  ]);
  return { items, total, page, limit };
};

/**
 * Lấy danh sách audit logs toàn hệ thống (admin page).
 */
export const getAuditLogs = async ({
  page = 1,
  limit = 20,
  keyword,
  userId,
  action,
  resourceType,
  from,
  to,
} = {}) => {
  const where = {};

  if (userId) where.actor_id = Number(userId);
  if (action) where.action = action;
  if (resourceType) where.resource_type = resourceType;

  if (from || to) {
    where.created_at = {};
    if (from) where.created_at.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      where.created_at.lte = toDate;
    }
  }

  if (keyword) {
    where.OR = [
      { actor_name: { contains: keyword } },
      { resource_type: { contains: keyword } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.auditLogs.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLogs.count({ where }),
  ]);

  return { items, total, page, limit };
};

/**
 * Lấy chi tiết một audit log entry.
 */
export const getAuditLogById = async (id) => {
  return prisma.auditLogs.findUnique({ where: { id: Number(id) } });
};
