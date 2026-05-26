import { Router } from 'express';
import { authenticate, requireRole } from '@my/auth-backend';
import * as ctrl from './controller.js';

const router = Router();

// Lễ tân, Quản lý, Admin đều thao tác được với Tenants
router.get('/tenants', authenticate, requireRole(['ADMIN', 'MANAGER', 'RECEPTIONIST']), ctrl.getTenants);
router.get('/tenants/:id', authenticate, requireRole(['ADMIN', 'MANAGER', 'RECEPTIONIST']), ctrl.getTenantById);
router.post('/tenants', authenticate, requireRole(['ADMIN', 'MANAGER', 'RECEPTIONIST']), ctrl.createTenant);
router.put('/tenants/:id', authenticate, requireRole(['ADMIN', 'MANAGER', 'RECEPTIONIST']), ctrl.updateTenant);

router.get('/tenants/:id/history', authenticate, requireRole(['ADMIN', 'MANAGER']), ctrl.getTenantHistory);

// Tạm trú/vắng
router.get('/tenants/:id/registrations', authenticate, requireRole(['ADMIN', 'MANAGER', 'RECEPTIONIST']), ctrl.getRegistrationsByTenant);
router.post('/tenants/:id/registrations', authenticate, requireRole(['ADMIN', 'MANAGER', 'RECEPTIONIST']), ctrl.createRegistration);

export default router;
