import * as service from './service.js';

export const getContracts = async (req, res) => {
  try {
    const data = await service.getContracts(req.query);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getContractById = async (req, res) => {
  try {
    const data = await service.getContractById(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getExpiringSoon = async (req, res) => {
  try {
    const data = await service.getExpiringSoon();
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const createContract = async (req, res) => {
  try {
    const userId = req.user.userId;
    const data = await service.createContract(req.body, userId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateContract = async (req, res) => {
  try {
    const data = await service.updateContract(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const terminateContract = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { termination_reason } = req.body;
    const data = await service.terminateContract(req.params.id, termination_reason, userId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const renewContract = async (req, res) => {
  try {
    const userId = req.user.userId;
    const data = await service.renewContract(req.params.id, req.body, userId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getRenewals = async (req, res) => {
  try {
    const data = await service.getRenewals(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
