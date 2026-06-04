import { Router } from 'express';
import { authenticate } from '@my/auth-backend';
import * as ctrl from './controller.js';

const router = Router();

// Tất cả routes yêu cầu đăng nhập — user chỉ thấy notification của mình
router.get('/', authenticate, ctrl.getNotifications);
router.get('/count', authenticate, ctrl.getUnreadCount);
router.put('/:id/read', authenticate, ctrl.markAsRead);
router.patch('/:id/read', authenticate, ctrl.markAsRead);
router.put('/read-all', authenticate, ctrl.markAllAsRead);
router.patch('/read-all', authenticate, ctrl.markAllAsRead);

export default router;
