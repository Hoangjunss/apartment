import { Router } from 'express';
import { authenticate, requireRole } from '@my/auth-backend';
import * as ctrl from './controller.js';
import { getAuditHistory } from '@my/audit-log-backend/service';
import { checkPolicy } from '@my/policy-backend';

const router = Router();

const ALL_ROLES = ['ADMIN', 'MANAGER', 'RECEPTIONIST'];
const MGT_ROLES = ['ADMIN', 'MANAGER'];

// ==========================================
// TENANTS
// ==========================================
router.get('/tenants', authenticate, requireRole(ALL_ROLES), ctrl.getTenants);
router.post('/tenants', authenticate, requireRole(ALL_ROLES), ctrl.createTenant);
router.get('/tenants/:id', authenticate, requireRole(ALL_ROLES), checkPolicy('Tenant', 'read'), ctrl.getTenantById);
router.get('/tenants/:id/preview', authenticate, requireRole(ALL_ROLES), checkPolicy('Tenant', 'read'), ctrl.getTenantPreview);
router.put('/tenants/:id', authenticate, requireRole(ALL_ROLES), checkPolicy('Tenant', 'update'), ctrl.updateTenant);

router.get('/tenants/:id/history', authenticate, requireRole(MGT_ROLES), checkPolicy('Tenant', 'read'), ctrl.getTenantHistory);

// Audit history của 1 khách thuê
router.get('/tenants/:id/audit-history', authenticate, requireRole(MGT_ROLES), checkPolicy('Tenant', 'read'), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const data = await getAuditHistory('Tenant', +req.params.id, { page: +page, limit: +limit });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// TEMPORARY REGISTRATIONS
// ==========================================
// Lịch sử khai báo của 1 khách thuê
router.get('/tenants/:id/registrations', authenticate, requireRole(ALL_ROLES), checkPolicy('Tenant', 'read'), ctrl.getRegistrationsByTenant);

// Tạo khai báo mới cho 1 khách thuê
router.post('/tenants/:id/registrations', authenticate, requireRole(ALL_ROLES), checkPolicy('Tenant', 'update'), ctrl.createRegistration);

// Toàn bộ khai báo (có thể xem tất cả)
router.get('/registrations', authenticate, requireRole(MGT_ROLES), ctrl.getAllRegistrations);

export default router;
