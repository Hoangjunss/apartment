import { Router } from 'express';
import { authenticate } from '@my/auth-backend';
import * as ctrl from './controller.js';

const router = Router();

router.get('/', authenticate, ctrl.handleGlobalSearch);

export default router;
