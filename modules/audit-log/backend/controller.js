import * as service from './service.js';

export const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, keyword, userId, action, resourceType, from, to } = req.query;
    const data = await service.getAuditLogs({
      page: +page,
      limit: +limit,
      keyword,
      userId: userId ? +userId : undefined,
      action,
      resourceType,
      from,
      to,
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAuditLogById = async (req, res) => {
  try {
    const data = await service.getAuditLogById(+req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Không tìm thấy audit log' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAuditHistory = async (req, res) => {
  try {
    const { resourceType, resourceId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const data = await service.getAuditHistory(resourceType, +resourceId, { page: +page, limit: +limit });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
