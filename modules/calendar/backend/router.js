import { Router } from 'express';
import { authenticate, requireRole } from '@my/auth-backend';
import * as ctrl from './controller.js';

const router = Router();
const OPERATIONAL_ROLES = ['ADMIN', 'MANAGER', 'RECEPTIONIST'];

router.get('/events', authenticate, requireRole(OPERATIONAL_ROLES), ctrl.getEvents);

export default router;
