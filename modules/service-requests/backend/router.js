import { Router } from 'express';
import { authenticate, requireRole } from '@my/auth-backend';
import * as ctrl from './controller.js';

const router = Router();

const MGT_ROLES = ['ADMIN', 'MANAGER'];
const CREATOR_ROLES = ['ADMIN', 'MANAGER', 'RECEPTIONIST'];
const ALL_ROLES = ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'TECHNICIAN'];

// Xem tất cả yêu cầu — ADMIN/MANAGER
router.get('/', authenticate, requireRole(MGT_ROLES), ctrl.getAll);

// Xem việc của mình (TECHNICIAN dùng) — tất cả role đã login
router.get('/my', authenticate, ctrl.getMy);

// Chi tiết 1 yêu cầu — tất cả role
router.get('/:id', authenticate, requireRole(ALL_ROLES), ctrl.getById);

// Tạo yêu cầu mới — ADMIN/MANAGER/RECEPTIONIST
router.post('/', authenticate, requireRole(CREATOR_ROLES), ctrl.create);

// Assign cho kỹ thuật viên — ADMIN/MANAGER
router.patch('/:id/assign', authenticate, requireRole(MGT_ROLES), ctrl.assign);

// Cập nhật status:
// - ADMIN/MANAGER: update bất kỳ
// - TECHNICIAN: chỉ update việc được giao cho mình (kiểm tra trong controller)
router.patch('/:id/status', authenticate, requireRole(ALL_ROLES), ctrl.updateStatus);

export default router;
