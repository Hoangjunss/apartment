import { Router } from 'express';
import * as ctrl from './controller.js';
import rateLimit from 'express-rate-limit';

const router = Router();

const publicLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 1 phút.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Lấy thông tin phòng qua token
router.get('/room-info', publicLimiter, ctrl.getRoomInfo);

// Tạo yêu cầu từ form public (khách thuê gửi qua QR code)
router.post('/service-requests', publicLimiter, ctrl.createPublicRequest);

export default router;
