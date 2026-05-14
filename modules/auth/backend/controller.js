import * as service from './service.js';

const getErrorStatus = (message) => {
  if (message.includes('Sai thông tin đăng nhập') || message.includes('không hợp lệ') || message.includes('hết hạn')) {
    return 401;
  }
  if (message.includes('bị khóa')) {
    return 403;
  }
  if (message.includes('Không tìm thấy')) {
    return 404;
  }
  if (message.includes('tồn tại')) {
    return 409;
  }
  if (message.includes('không chính xác')) {
    return 400;
  }
  return 500;
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp email và password' });
    }
    const data = await service.login(email, password);
    res.json({ success: true, data });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};

export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp refreshToken' });
    }
    const data = await service.refresh(refreshToken);
    res.json({ success: true, data });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};

export const logout = async (req, res) => {
  // Jwt logout thường được xử lý ở frontend bằng cách xóa token.
  // Nếu có blacklist thì xử lý ở đây.
  res.json({ success: true, message: 'Đăng xuất thành công' });
};

export const getMe = async (req, res) => {
  try {
    const data = await service.getMe(req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mật khẩu cũ và mới' });
    }
    await service.changePassword(req.user.userId, oldPassword, newPassword);
    res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const data = await service.getUsers({ page: +page, limit: +limit, search });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const data = await service.createUser(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const data = await service.updateUser(+req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};

export const toggleActive = async (req, res) => {
  try {
    const data = await service.toggleActive(+req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};
