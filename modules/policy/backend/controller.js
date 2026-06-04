import * as service from './service.js';

export const getAll = async (req, res) => {
  try {
    const data = await service.getAllAssignments();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const assign = async (req, res) => {
  try {
    const { user_id, building_id } = req.body;
    if (!user_id || !building_id) {
      return res.status(400).json({ success: false, message: 'Thiếu user_id hoặc building_id' });
    }
    const data = await service.assignBuilding(user_id, building_id, req.user.userId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const revoke = async (req, res) => {
  try {
    const data = await service.revokeAssignment(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
