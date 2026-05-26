import { Router } from 'express';
import { authenticate, requireRole } from '@my/auth-backend';
import * as ctrl from './controller.js';

const router = Router();

const STAFF_ROLES = ['ADMIN', 'MANAGER', 'RECEPTIONIST'];
const MGT_ROLES = ['ADMIN', 'MANAGER'];

// Utilities (Điện Nước)
router.get('/utilities', authenticate, ctrl.getUtilities);
router.post('/utilities', authenticate, requireRole(STAFF_ROLES), ctrl.recordUtility);

// Invoices (Hóa Đơn)
router.get('/invoices', authenticate, ctrl.getInvoices);
router.get('/invoices/:id', authenticate, ctrl.getInvoiceById);
router.post('/invoices/generate', authenticate, requireRole(MGT_ROLES), ctrl.generateInvoice);
router.patch('/invoices/:id/status', authenticate, requireRole(MGT_ROLES), ctrl.updateInvoiceStatus);

// Payments (Phiếu Thu)
router.post('/payments', authenticate, requireRole(STAFF_ROLES), ctrl.recordPayment);

export default router;
