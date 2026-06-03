import { Router } from 'express';
import { authenticate, requireRole } from '@my/auth-backend';
import * as ctrl from './controller.js';

const router = Router();

const AUDIT_ROLES = ['ADMIN', 'MANAGER'];

// Trang quản trị — xem toàn bộ audit logs
router.get('/', authenticate, requireRole(AUDIT_ROLES), ctrl.getAuditLogs);

// Chi tiết một log entry
router.get('/:id(\\d+)', authenticate, requireRole(AUDIT_ROLES), ctrl.getAuditLogById);

// Generic audit history endpoint — extensible cho mọi resource type
// GET /audit-logs/history/:resourceType/:resourceId
router.get(
  '/history/:resourceType/:resourceId',
  authenticate,
  requireRole(AUDIT_ROLES),
  ctrl.getAuditHistory
);

export default router;
