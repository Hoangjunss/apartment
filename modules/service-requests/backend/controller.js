import * as service from './service.js';

export const getAll = async (req, res) => {
  try {
    const data = await service.getAll(req.query);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMy = async (req, res) => {
  try {
    const data = await service.getMy(req.user.userId, req.user.role);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getById = async (req, res) => {
  try {
    const data = await service.getById(Number(req.params.id));
    if (!data) return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const create = async (req, res) => {
  try {
    const data = await service.create(req.body, req.user.userId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const assign = async (req, res) => {
  try {
    const { assigned_to } = req.body;
    if (!assigned_to) return res.status(400).json({ success: false, message: 'Thiếu assigned_to' });
    const data = await service.assign(Number(req.params.id), Number(assigned_to));
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'Thiếu status' });
    const data = await service.updateStatus(
      Number(req.params.id),
      status,
      req.user.userId,
      req.user.role,
      req.body
    );
    res.json({ success: true, data });
  } catch (err) {
    res.status(403).json({ success: false, message: err.message });
  }
};
