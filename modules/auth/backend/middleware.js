import jwt from 'jsonwebtoken';

// Nên lấy từ biến môi trường, dùng fallback cho development
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

/**
 * Middleware xác thực JWT token
 */
export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Thiếu hoặc sai định dạng token' });
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET);
    
    // Lưu thông tin user vào request
    req.user = payload; // { userId, email, role }
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token đã hết hạn' });
    }
    return res.status(401).json({ success: false, message: 'Token không hợp lệ' });
  }
};

/**
 * Middleware kiểm tra Role (RBAC)
 * @param {string[]} roles - Mảng các role được phép truy cập
 */
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ success: false, message: 'Không thể xác định quyền truy cập' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập chức năng này' });
    }

    next();
  };
};
