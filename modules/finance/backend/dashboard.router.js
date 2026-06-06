import express from 'express';
import { authenticate } from '@my/auth-backend';
import * as service from './dashboard.service.js';
import { getAssignedBuildingIds } from '@my/policy-backend';

const router = express.Router();

// Middleware lấy allowedBuildingIds một lần duy nhất cho request
const injectAllowedBuildings = async (req, res, next) => {
  try {
    req.allowedBuildingIds = req.user.role === 'ADMIN' ? 'ALL' : await getAssignedBuildingIds(req.user.userId);
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi xác thực phạm vi tòa nhà: ' + err.message });
  }
};

router.use(authenticate);
router.use(injectAllowedBuildings);

router.get('/stats', async (req, res) => {
  try {
    const data = await service.getDashboardStats(req.user.role, req.user.userId, req.allowedBuildingIds);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/revenue', async (req, res) => {
  try {
    const months = req.query.months ? Number(req.query.months) : 6;
    const data = await service.getRevenueHistory(months, req.allowedBuildingIds);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/apartment-types', async (req, res) => {
  try {
    const data = await service.getApartmentTypes(req.allowedBuildingIds);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/unpaid-invoices', async (req, res) => {
  try {
    const data = await service.getUnpaidInvoices(req.allowedBuildingIds);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/recent-activities', async (req, res) => {
  try {
    const data = await service.getRecentActivities(req.allowedBuildingIds);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
