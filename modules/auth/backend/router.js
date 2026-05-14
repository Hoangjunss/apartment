import { Router } from 'express';
import { authenticate, requireRole } from './middleware.js';
import * as ctrl from './controller.js';

const router = Router();

// --- Nhóm Public ---
router.post('/login', ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', authenticate, ctrl.logout);

// --- Nhóm Auth ---
router.get('/me', authenticate, ctrl.getMe);
router.put('/change-password', authenticate, ctrl.changePassword);

// --- Nhóm ADMIN ---
router.get('/users', authenticate, requireRole(['ADMIN']), ctrl.getUsers);
router.post('/users', authenticate, requireRole(['ADMIN']), ctrl.createUser);
router.put('/users/:id', authenticate, requireRole(['ADMIN']), ctrl.updateUser);
router.patch('/users/:id/toggle-active', authenticate, requireRole(['ADMIN']), ctrl.toggleActive);

export default router;
