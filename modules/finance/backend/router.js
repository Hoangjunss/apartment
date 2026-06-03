import { Router } from 'express';
import { authenticate, requireRole } from '@my/auth-backend';
import * as ctrl from './controller.js';

const router = Router();

const STAFF_ROLES = ['ADMIN', 'MANAGER', 'RECEPTIONIST'];
const MGT_ROLES = ['ADMIN', 'MANAGER'];

// Utilities (Điện Nước) — TECHNICIAN không có quyền
router.get('/utilities', authenticate, requireRole(STAFF_ROLES), ctrl.getUtilities);
router.post('/utilities', authenticate, requireRole(STAFF_ROLES), ctrl.recordUtility);
router.post('/utilities/bulk-import', authenticate, requireRole(STAFF_ROLES), ctrl.uploadMiddleware, ctrl.bulkImportUtilities);
router.post('/utilities/import-preview', authenticate, requireRole(STAFF_ROLES), ctrl.uploadMiddleware, ctrl.importPreview);
router.post('/utilities/bulk-save', authenticate, requireRole(STAFF_ROLES), ctrl.bulkSaveUtilities);
router.get('/utilities/template', authenticate, requireRole(STAFF_ROLES), ctrl.downloadTemplate);

// Invoices (Hóa Đơn) — TECHNICIAN không có quyền xem hóa đơn
router.get('/invoices', authenticate, requireRole(STAFF_ROLES), ctrl.getInvoices);
router.get('/invoices/:id', authenticate, requireRole(STAFF_ROLES), ctrl.getInvoiceById);
router.post('/invoices/generate', authenticate, requireRole(MGT_ROLES), ctrl.generateInvoice);
router.patch('/invoices/:id/status', authenticate, requireRole(MGT_ROLES), ctrl.updateInvoiceStatus);

// Payments (Phiếu Thu)
router.post('/payments', authenticate, requireRole(STAFF_ROLES), ctrl.recordPayment);

// Credits (Ví dư & Hoàn trả)
router.get('/contracts/:id/credits', authenticate, requireRole(STAFF_ROLES), ctrl.getContractCreditDetails);
router.post('/contracts/:id/credits/refund', authenticate, requireRole(MGT_ROLES), ctrl.refundContractCredit);

export default router;
