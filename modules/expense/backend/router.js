import { Router } from 'express';
import { authenticate, requireRole } from '@my/auth-backend';
import * as ctrl from './controller.js';

const router = Router();

const STAFF_ROLES = ['ADMIN', 'MANAGER', 'RECEPTIONIST'];
const ADMIN_ROLE = ['ADMIN'];

router.get('/', authenticate, requireRole(STAFF_ROLES), ctrl.getExpenses);
router.get('/summary', authenticate, requireRole(STAFF_ROLES), ctrl.getExpensesSummary);
router.post('/', authenticate, requireRole(STAFF_ROLES), ctrl.createExpense);
router.put('/:id', authenticate, requireRole(STAFF_ROLES), ctrl.updateExpense);
router.patch('/:id/status', authenticate, requireRole(STAFF_ROLES), ctrl.updateExpenseStatus);
router.delete('/:id', authenticate, requireRole(ADMIN_ROLE), ctrl.deleteExpense);

export default router;
