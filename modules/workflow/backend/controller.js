import * as service from './service.js';

export const getWorkflow = async (req, res) => {
  try {
    const data = await service.getWorkflowByName(req.params.name);
    if (!data) return res.status(404).json({ success: false, message: 'Workflow không tồn tại' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAvailableTransitions = async (req, res) => {
  try {
    const { workflowName, currentStepName } = req.query;
    if (!workflowName || !currentStepName) {
      return res.status(400).json({ success: false, message: 'Thiếu workflowName hoặc currentStepName' });
    }
    const data = await service.getAvailableTransitions(workflowName, currentStepName, req.user?.role);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAllWorkflows = async (req, res) => {
  try {
    const data = await service.getAllWorkflows();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createStep = async (req, res) => {
  try {
    const data = await service.createStep(req.params.workflowId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const createTransition = async (req, res) => {
  try {
    const data = await service.createTransition(req.params.workflowId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
