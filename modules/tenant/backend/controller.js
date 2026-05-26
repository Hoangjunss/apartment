import * as service from './service.js';

export const getTenants = async (req, res) => {
  try {
    const data = await service.getTenants(req.query);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getTenantById = async (req, res) => {
  try {
    const data = await service.getTenantById(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const createTenant = async (req, res) => {
  try {
    const data = await service.createTenant(req.body);
    res.json({ success: true, data });
  } catch (error) {
    if (error.status === 409) {
      return res.status(409).json({
        success: false,
        message: error.message,
        existingId: error.existingId
      });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateTenant = async (req, res) => {
  try {
    const data = await service.updateTenant(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (error) {
    if (error.status === 409) {
      return res.status(409).json({
        success: false,
        message: error.message,
        existingId: error.existingId
      });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getTenantHistory = async (req, res) => {
  try {
    const data = await service.getTenantHistory(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getRegistrationsByTenant = async (req, res) => {
  try {
    const data = await service.getRegistrationsByTenant(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const createRegistration = async (req, res) => {
  try {
    const userId = req.user.userId;
    const data = await service.createRegistration(req.params.id, req.body, userId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
