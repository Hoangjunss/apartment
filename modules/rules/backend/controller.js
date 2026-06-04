import * as service from './service.js';

export const getAll = async (req, res) => {
  try {
    const data = await service.getAllRules();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const create = async (req, res) => {
  try {
    const data = await service.createRule(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const data = await service.updateRule(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    await service.deleteRule(req.params.id);
    res.json({ success: true, message: 'Xóa quy tắc thành công' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const triggerScan = async (req, res) => {
  try {
    await service.runScheduledRules();
    res.json({ success: true, message: 'Kích hoạt quét quy tắc thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
