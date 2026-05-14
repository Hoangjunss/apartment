import * as service from './service.js';

const getErrorStatus = (message) => {
  if (message.includes('đã tồn tại')) return 409;
  if (message.includes('không được nhỏ hơn') || message.includes('không có hợp đồng đang hiệu lực')) return 400;
  return 500;
};

// ==========================================
// TENANTS
// ==========================================

export const getTenants = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const data = await service.getTenants({ page: +page, limit: +limit, search, status });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getTenantById = async (req, res) => {
  try {
    const data = await service.getTenantById(+req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ khách thuê' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getTenantHistory = async (req, res) => {
  try {
    const data = await service.getTenantHistory(+req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createTenant = async (req, res) => {
  try {
    const data = await service.createTenant(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};

export const updateTenant = async (req, res) => {
  try {
    const data = await service.updateTenant(+req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};

// ==========================================
// TEMPORARY REGISTRATIONS
// ==========================================

export const getRegistrationsByTenant = async (req, res) => {
  try {
    const data = await service.getRegistrationsByTenant(+req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createRegistration = async (req, res) => {
  try {
    const { type, start_date, end_date } = req.body;
    if (!type || !start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đủ type, start_date, end_date' });
    }
    const data = await service.createRegistration(+req.params.id, req.body, req.user.userId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};

export const getAllRegistrations = async (req, res) => {
  try {
    const { page = 1, limit = 20, month, year } = req.query;
    const data = await service.getAllRegistrations({ 
      page: +page, 
      limit: +limit, 
      month: month ? +month : undefined, 
      year: year ? +year : undefined 
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
