import { Router } from 'express';
import { authenticate, requireRole } from '@my/auth-backend';
import * as ctrl from './controller.js';

const router = Router();

// Lọc hợp đồng sắp hết hạn (Must be defined before /:id)
router.get('/expiring-soon', authenticate, requireRole(['ADMIN', 'MANAGER']), ctrl.getExpiringSoon);

// Thao tác chung
router.get('/', authenticate, requireRole(['ADMIN', 'MANAGER']), ctrl.getContracts);
router.get('/:id', authenticate, requireRole(['ADMIN', 'MANAGER', 'RECEPTIONIST']), ctrl.getContractById);
router.post('/', authenticate, requireRole(['ADMIN', 'MANAGER']), ctrl.createContract);
router.put('/:id', authenticate, requireRole(['ADMIN', 'MANAGER']), ctrl.updateContract);

// Gia hạn, chấm dứt
router.patch('/:id/terminate', authenticate, requireRole(['ADMIN', 'MANAGER']), ctrl.terminateContract);
router.post('/:id/renew', authenticate, requireRole(['ADMIN', 'MANAGER']), ctrl.renewContract);
router.get('/:id/renewals', authenticate, requireRole(['ADMIN', 'MANAGER']), ctrl.getRenewals);

export default router;
