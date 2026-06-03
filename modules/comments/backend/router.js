import { Router } from 'express';
import { authenticate } from '@my/auth-backend';
import * as ctrl from './controller.js';

const router = Router();

router.get('/:serviceRequestId', authenticate, ctrl.getComments);
router.post('/', authenticate, ctrl.createComment);

export default router;
