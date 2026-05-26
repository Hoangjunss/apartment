// modules/auth/frontend/services/auth.api.js
import { api } from '@/lib/axios.js';

/**
 * Đăng nhập
 * @returns {{ accessToken, refreshToken, user }}
 */
export async function login(email, password) {
  const res = await api.post('/auth/login', { email, password });
  return res.data.data;
}

/**
 * Đăng xuất
 */
export async function logout() {
  const res = await api.post('/auth/logout');
  return res.data;
}

/**
 * Lấy thông tin user hiện tại
 */
export async function getMe() {
  const res = await api.get('/auth/me');
  return res.data.data;
}

/**
 * Đổi mật khẩu
 */
export async function changePassword(oldPassword, newPassword) {
  const res = await api.put('/auth/change-password', { oldPassword, newPassword });
  return res.data;
}

/**
 * Lấy danh sách nhân viên (ADMIN only)
 */
export async function getUsers(params = {}) {
  const res = await api.get('/auth/users', { params });
  return res.data.data;
}

/**
 * Tạo nhân viên mới (ADMIN only)
 */
export async function createUser(data) {
  const res = await api.post('/auth/users', data);
  return res.data.data;
}

/**
 * Cập nhật thông tin nhân viên (ADMIN only)
 */
export async function updateUser(id, data) {
  const res = await api.put(`/auth/users/${id}`, data);
  return res.data.data;
}

/**
 * Toggle khoá/mở khoá tài khoản (ADMIN only)
 */
export async function toggleUserActive(id) {
  const res = await api.patch(`/auth/users/${id}/toggle-active`);
  return res.data.data;
}
