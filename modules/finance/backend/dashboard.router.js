import express from 'express';
import { authenticate } from '@my/auth-backend';
import * as service from './dashboard.service.js';

const router = express.Router();

router.get('/stats', authenticate, async (req, res) => {
  try {
    const data = await service.getDashboardStats();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/revenue', authenticate, async (req, res) => {
  try {
    const months = req.query.months ? Number(req.query.months) : 6;
    const data = await service.getRevenueHistory(months);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/apartment-types', authenticate, async (req, res) => {
  try {
    const data = await service.getApartmentTypes();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/unpaid-invoices', authenticate, async (req, res) => {
  try {
    const data = await service.getUnpaidInvoices();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/recent-activities', authenticate, async (req, res) => {
  try {
    const data = await service.getRecentActivities();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
