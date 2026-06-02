import { Router } from 'express';
import * as ctrl from './controller.js';

const router = Router();

// Lấy thông tin phòng qua token
router.get('/room-info', ctrl.getRoomInfo);

// Tạo yêu cầu từ form public (khách thuê gửi qua QR code)
router.post('/service-requests', ctrl.createPublicRequest);

export default router;
