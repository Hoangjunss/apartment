import { Router } from 'express';
import * as ctrl from './controller.js';
import { authenticate, requireRole } from '@my/auth-backend';

const router = Router();

router.use(authenticate);
router.use(requireRole(['ADMIN'])); // Chỉ Admin được quản lý các rules

router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/trigger-scan', ctrl.triggerScan); // Endpoint thủ công để kích hoạt quét

export default router;
