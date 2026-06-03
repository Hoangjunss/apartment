import * as service from './service.js';

export const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, isRead } = req.query;
    const data = await service.getNotifications(req.user.userId, {
      page: +page,
      limit: +limit,
      isRead,
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const count = await service.getUnreadCount(req.user.userId);
    res.json({ success: true, data: { count } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const data = await service.markAsRead(+req.params.id, req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    const status = err.message.includes('Không tìm thấy') ? 404 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const data = await service.markAllAsRead(req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
