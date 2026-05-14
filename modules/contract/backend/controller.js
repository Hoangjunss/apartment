import * as service from './service.js';

const getErrorStatus = (message) => {
  if (message.includes('Không tìm thấy')) return 404;
  if (message.includes('đang có hợp đồng')) return 409;
  if (
    message.includes('lớn hơn') ||
    message.includes('trạng thái') ||
    message.includes('từ ngày 1 đến 28') ||
    message.includes('Chỉ được gia hạn')
  ) {
    return 400;
  }
  return 500;
};

export const getContracts = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, apartment_id, tenant_id } = req.query;
    const data = await service.getContracts({
      page: +page,
      limit: +limit,
      status,
      apartment_id: apartment_id ? +apartment_id : undefined,
      tenant_id: tenant_id ? +tenant_id : undefined,
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getContractById = async (req, res) => {
  try {
    const data = await service.getContractById(+req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Không tìm thấy hợp đồng' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createContract = async (req, res) => {
  try {
    const { tenant_id, apartment_id, start_date, end_date, monthly_rent, payment_due_day } = req.body;
    if (!tenant_id || !apartment_id || !start_date || !end_date || !monthly_rent || !payment_due_day) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đủ thông tin bắt buộc' });
    }

    const data = await service.createContract(req.body, req.user.userId);
    res.status(201).json({ success: true, data, message: 'Tạo hợp đồng thành công' });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};

export const updateContract = async (req, res) => {
  try {
    const data = await service.updateContract(+req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};

export const terminateContract = async (req, res) => {
  try {
    const { termination_reason } = req.body;
    const data = await service.terminateContract(+req.params.id, termination_reason, req.user.userId);
    res.json({ success: true, data, message: 'Chấm dứt hợp đồng thành công' });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};

export const renewContract = async (req, res) => {
  try {
    const { new_end_date } = req.body;
    if (!new_end_date) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp new_end_date' });
    }

    const data = await service.renewContract(+req.params.id, req.body, req.user.userId);
    res.json({ success: true, data, message: 'Gia hạn hợp đồng thành công' });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};

export const getRenewals = async (req, res) => {
  try {
    const data = await service.getRenewals(+req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getExpiringSoon = async (req, res) => {
  try {
    const data = await service.getExpiringSoon();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
