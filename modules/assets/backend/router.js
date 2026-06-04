import { Router } from 'express';
import { authenticate, requireRole } from '@my/auth-backend';
import { checkPolicy } from '@my/policy-backend';
import * as ctrl from './controller.js';

const router = Router();

const ALL_ROLES = ['ADMIN', 'MANAGER', 'TECHNICIAN', 'RECEPTIONIST'];
const MGT_ROLES = ['ADMIN', 'MANAGER'];

router.get('/assets', authenticate, ctrl.getAssets);
router.get('/assets/code/:code', authenticate, ctrl.getAssetByCode);
router.get('/assets/:id', authenticate, checkPolicy('Asset', 'read'), ctrl.getAssetById);
router.post('/assets', authenticate, requireRole(MGT_ROLES), ctrl.createAsset);
router.put('/assets/:id', authenticate, requireRole(MGT_ROLES), checkPolicy('Asset', 'update'), ctrl.updateAsset);
router.delete('/assets/:id', authenticate, requireRole(['ADMIN']), checkPolicy('Asset', 'delete'), ctrl.deleteAsset);

// Polymorphic sub-routes
router.get('/assets/:id/timeline', authenticate, checkPolicy('Asset', 'read'), ctrl.getAssetTimeline);
router.get('/assets/:id/attachments', authenticate, checkPolicy('Asset', 'read'), ctrl.getAssetAttachments);

export default router;
