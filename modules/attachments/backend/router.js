import { Router } from 'express';
import { authenticate } from '@my/auth-backend';
import * as ctrl from './controller.js';

const router = Router();

router.get('/', authenticate, ctrl.getAttachments);
router.post('/upload', authenticate, ctrl.uploadMiddleware, ctrl.uploadAttachment);
router.delete('/:id', authenticate, ctrl.deleteAttachment);

export default router;
