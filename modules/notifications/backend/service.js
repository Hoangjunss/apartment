import { prisma } from '@my/prisma';

// ─── WebSocket IO instance ─────────────────────────────────────────────────
// Set từ server.js sau khi khởi tạo Socket.io
let _io = null;

export const setIo = (io) => {
  _io = io;
};

/**
 * Tạo một notification và emit real-time tới user qua WebSocket.
 *
 * @param {object} params
 * @param {number}   params.userId     - ID người nhận
 * @param {string}   params.title      - Tiêu đề
 * @param {string}   params.message    - Nội dung
 * @param {string}   params.type       - CONTRACT_EXPIRING | INVOICE_OVERDUE | MAINTENANCE_ASSIGNED | PAYMENT_RECEIVED
 * @param {string}   [params.entityType] - Contract | Invoice | ... (extensible)
 * @param {number}   [params.entityId]   - ID bản ghi liên quan
 */
export const createNotification = async ({
  userId,
  title,
  message,
  type,
  entityType = null,
  entityId = null,
}) => {
  try {
    const notification = await prisma.notifications.create({
      data: {
        user_id: userId,
        title,
        message,
        type,
        entity_type: entityType,
        entity_id: entityId,
      },
    });

    // Emit real-time tới user qua Socket.io
    if (_io) {
      _io.to(`user:${userId}`).emit('notification', notification);
    }

    return notification;
  } catch (err) {
    console.error('[Notifications] Failed to create notification:', err.message);
  }
};

/**
 * Lấy danh sách notifications của user hiện tại.
 */
export const getNotifications = async (userId, { page = 1, limit = 20, isRead } = {}) => {
  const where = { user_id: Number(userId) };
  if (isRead !== undefined) where.is_read = isRead === 'true' || isRead === true;

  const [items, total] = await Promise.all([
    prisma.notifications.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notifications.count({ where }),
  ]);

  return { items, total, page, limit };
};

/**
 * Đếm số unread notifications của user.
 */
export const getUnreadCount = async (userId) => {
  return prisma.notifications.count({
    where: { user_id: Number(userId), is_read: false },
  });
};

/**
 * Đánh dấu 1 notification đã đọc.
 */
export const markAsRead = async (id, userId) => {
  const notification = await prisma.notifications.findFirst({
    where: { id: Number(id), user_id: Number(userId) },
  });
  if (!notification) throw new Error('Không tìm thấy thông báo');

  return prisma.notifications.update({
    where: { id: Number(id) },
    data: { is_read: true },
  });
};

/**
 * Đánh dấu tất cả notifications của user đã đọc.
 */
export const markAllAsRead = async (userId) => {
  const result = await prisma.notifications.updateMany({
    where: { user_id: Number(userId), is_read: false },
    data: { is_read: true },
  });
  return { updated: result.count };
};
