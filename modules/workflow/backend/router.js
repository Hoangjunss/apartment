import { Router } from 'express';
import * as ctrl from './controller.js';
import { authenticate, requireRole } from '@my/auth-backend';

const router = Router();

router.use(authenticate); // Tất cả API yêu cầu đăng nhập

router.get('/available-transitions', ctrl.getAvailableTransitions);
router.get('/:name', ctrl.getWorkflow);

// Chỉ admin mới có quyền quản lý và cấu hình workflow
router.get('/', requireRole(['ADMIN']), ctrl.getAllWorkflows);
router.post('/:workflowId/steps', requireRole(['ADMIN']), ctrl.createStep);
router.post('/:workflowId/transitions', requireRole(['ADMIN']), ctrl.createTransition);

export default router;
