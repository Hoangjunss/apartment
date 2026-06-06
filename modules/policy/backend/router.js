import { Router } from 'express';
import * as ctrl from './controller.js';
import { authenticate, requireRole } from '@my/auth-backend';

const router = Router();

router.use(authenticate);

router.get('/assignments', ctrl.getAll);
router.post('/assignments', requireRole(['ADMIN']), ctrl.assign);
router.patch('/assignments/:id/revoke', requireRole(['ADMIN']), ctrl.revoke);

export default router;
