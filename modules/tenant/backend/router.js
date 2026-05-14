import { Router } from 'express';
import { authenticate, requireRole } from '@my/auth-backend';
import * as ctrl from './controller.js';

const router = Router();

const ALL_ROLES = ['ADMIN', 'MANAGER', 'RECEPTIONIST'];
const MGT_ROLES = ['ADMIN', 'MANAGER'];

// ==========================================
// TENANTS
// ==========================================
router.get('/tenants', authenticate, requireRole(ALL_ROLES), ctrl.getTenants);
router.post('/tenants', authenticate, requireRole(ALL_ROLES), ctrl.createTenant);
router.get('/tenants/:id', authenticate, requireRole(ALL_ROLES), ctrl.getTenantById);
router.put('/tenants/:id', authenticate, requireRole(ALL_ROLES), ctrl.updateTenant);

router.get('/tenants/:id/history', authenticate, requireRole(MGT_ROLES), ctrl.getTenantHistory);

// ==========================================
// TEMPORARY REGISTRATIONS
// ==========================================
// Lịch sử khai báo của 1 khách thuê
router.get('/tenants/:id/registrations', authenticate, requireRole(ALL_ROLES), ctrl.getRegistrationsByTenant);

// Tạo khai báo mới cho 1 khách thuê
router.post('/tenants/:id/registrations', authenticate, requireRole(ALL_ROLES), ctrl.createRegistration);

// Toàn bộ khai báo (có thể xem tất cả)
router.get('/registrations', authenticate, requireRole(MGT_ROLES), ctrl.getAllRegistrations);

export default router;
