import { prisma } from '@my/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';
const SALT_ROUNDS = 10;

/**
 * Đăng nhập và sinh token
 */
export const login = async (email, password) => {
  const user = await prisma.users.findUnique({ where: { email } });
  
  if (!user) {
    throw new Error('Sai thông tin đăng nhập');
  }

  if (!user.is_active) {
    throw new Error('Tài khoản của bạn đã bị khóa');
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new Error('Sai thông tin đăng nhập');
  }

  // Update last_login_at
  await prisma.users.update({
    where: { id: user.id },
    data: { last_login_at: new Date() },
  });

  const payload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
  const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

  // Loại bỏ password_hash trước khi trả về
  const { password_hash, ...userWithoutPassword } = user;

  return { accessToken, refreshToken, user: userWithoutPassword };
};

/**
 * Refresh token
 */
export const refresh = async (refreshToken) => {
  try {
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const user = await prisma.users.findUnique({ where: { id: payload.userId } });

    if (!user || !user.is_active) {
      throw new Error('Tài khoản không hợp lệ hoặc đã bị khóa');
    }

    const newPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = jwt.sign(newPayload, JWT_SECRET, { expiresIn: '8h' });

    return { accessToken };
  } catch (error) {
    throw new Error('Refresh token không hợp lệ hoặc đã hết hạn');
  }
};

/**
 * Lấy thông tin user hiện tại
 */
export const getMe = async (userId) => {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      full_name: true,
      phone: true,
      role: true,
      is_active: true,
      last_login_at: true,
    },
  });

  if (!user) throw new Error('Không tìm thấy người dùng');
  return user;
};

/**
 * Đổi mật khẩu
 */
export const changePassword = async (userId, oldPassword, newPassword) => {
  const user = await prisma.users.findUnique({ where: { id: userId } });
  if (!user) throw new Error('Không tìm thấy người dùng');

  const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
  if (!isMatch) throw new Error('Mật khẩu cũ không chính xác');

  const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.users.update({
    where: { id: userId },
    data: { password_hash: newPasswordHash },
  });

  return true;
};

/**
 * ADMIN: Lấy danh sách users
 */
export const getUsers = async ({ page = 1, limit = 20, search }) => {
  const where = search
    ? {
        OR: [
          { email: { contains: search } },
          { full_name: { contains: search } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.users.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        email: true,
        full_name: true,
        phone: true,
        role: true,
        is_active: true,
        last_login_at: true,
        created_at: true,
      },
    }),
    prisma.users.count({ where }),
  ]);

  return { items, total, page, limit };
};

/**
 * ADMIN: Tạo user mới
 */
export const createUser = async (data) => {
  const existing = await prisma.users.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new Error(`Email '${data.email}' đã tồn tại`);
  }

  // Khởi tạo mật khẩu mặc định
  const defaultPassword = 'password123';
  const passwordHash = await bcrypt.hash(defaultPassword, SALT_ROUNDS);

  const newUser = await prisma.users.create({
    data: {
      email: data.email,
      full_name: data.full_name,
      phone: data.phone,
      role: data.role,
      password_hash: passwordHash,
    },
    select: {
      id: true,
      email: true,
      full_name: true,
      phone: true,
      role: true,
      is_active: true,
      created_at: true,
    },
  });

  return newUser;
};

/**
 * ADMIN: Cập nhật user
 */
export const updateUser = async (id, data) => {
  const user = await prisma.users.findUnique({ where: { id } });
  if (!user) throw new Error('Không tìm thấy người dùng');

  // Không cho phép đổi email qua đây để tránh conflict
  const { email, password_hash, ...updateData } = data;

  const updatedUser = await prisma.users.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      full_name: true,
      phone: true,
      role: true,
      is_active: true,
    },
  });

  return updatedUser;
};

/**
 * ADMIN: Toggle trạng thái active
 */
export const toggleActive = async (id) => {
  const user = await prisma.users.findUnique({ where: { id } });
  if (!user) throw new Error('Không tìm thấy người dùng');

  const updatedUser = await prisma.users.update({
    where: { id },
    data: { is_active: !user.is_active },
    select: {
      id: true,
      is_active: true,
    },
  });

  return updatedUser;
};
