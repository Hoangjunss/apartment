import { Router } from 'express';
import { authenticate, requireRole } from '@my/auth-backend';
import * as ctrl from './controller.js';

const router = Router();

const MGT_ROLES = ['ADMIN', 'MANAGER'];
const ALL_ROLES = ['ADMIN', 'MANAGER', 'RECEPTIONIST'];

// Danh sách hợp đồng
router.get('/', authenticate, requireRole(MGT_ROLES), ctrl.getContracts);

// Hợp đồng sắp hết hạn (API này phải để trước /:id)
router.get('/expiring-soon', authenticate, requireRole(MGT_ROLES), ctrl.getExpiringSoon);

// Chi tiết 1 hợp đồng
router.get('/:id', authenticate, requireRole(ALL_ROLES), ctrl.getContractById);

// Tạo mới
router.post('/', authenticate, requireRole(MGT_ROLES), ctrl.createContract);

// Cập nhật điều khoản cơ bản
router.put('/:id', authenticate, requireRole(MGT_ROLES), ctrl.updateContract);

// Vòng đời hợp đồng
router.patch('/:id/terminate', authenticate, requireRole(MGT_ROLES), ctrl.terminateContract);
router.post('/:id/renew', authenticate, requireRole(MGT_ROLES), ctrl.renewContract);
router.get('/:id/renewals', authenticate, requireRole(MGT_ROLES), ctrl.getRenewals);

export default router;
