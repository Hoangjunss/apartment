import { Router } from 'express';
import { authenticate, requireRole } from '@my/auth-backend';
import * as ctrl from './controller.js';

const router = Router();

// REPORTS (ADMIN/MANAGER ONLY)
router.get('/revenue', authenticate, requireRole(['ADMIN', 'MANAGER']), ctrl.getRevenueReport);
router.get('/occupancy', authenticate, requireRole(['ADMIN', 'MANAGER']), ctrl.getOccupancyReport);
router.get('/maintenance', authenticate, requireRole(['ADMIN', 'MANAGER']), ctrl.getMainMaintenanceReport || ctrl.getMaintenanceReport);
router.get('/contracts', authenticate, requireRole(['ADMIN', 'MANAGER']), ctrl.getContractsReport);
router.get('/weekly', authenticate, requireRole(['ADMIN', 'MANAGER']), ctrl.getWeeklyReport);
router.get('/weekly/candidates', authenticate, requireRole(['ADMIN', 'MANAGER']), ctrl.getWeeklyReportCandidates);
router.post('/weekly/trigger', authenticate, requireRole(['ADMIN', 'MANAGER']), ctrl.triggerWeeklyReport);



// EXPORTS (RBAC SUPPORT)
router.get('/export/tenants', authenticate, requireRole(['ADMIN', 'MANAGER', 'RECEPTIONIST']), ctrl.exportTenants);
router.get('/export/contracts', authenticate, requireRole(['ADMIN', 'MANAGER', 'RECEPTIONIST']), ctrl.exportContracts);
router.get('/export/invoices', authenticate, requireRole(['ADMIN', 'MANAGER', 'RECEPTIONIST']), ctrl.exportInvoices);
router.get('/export/revenue', authenticate, requireRole(['ADMIN', 'MANAGER']), ctrl.exportRevenue);

export default router;
