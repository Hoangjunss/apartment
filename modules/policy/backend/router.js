import { Router } from 'express';
import * as ctrl from './controller.js';
import { authenticate, requireRole } from '@my/auth-backend';

const router = Router();

router.use(authenticate);
router.use(requireRole(['ADMIN'])); // Chỉ Admin mới được quản lý gán tòa nhà

router.get('/assignments', ctrl.getAll);
router.post('/assignments', ctrl.assign);
router.patch('/assignments/:id/revoke', ctrl.revoke);

export default router;
