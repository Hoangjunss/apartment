import { prisma } from '@my/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const SALT_ROUNDS = 10;

/**
 * Mã hóa một chiều Refresh Token bằng HMAC-SHA256
 */
export const hashToken = (token) => {
  return crypto
    .createHmac('sha256', JWT_REFRESH_SECRET)
    .update(token)
    .digest('hex');
};

/**
 * Đăng nhập và sinh token
 */
export const login = async (email, password, ipAddress, userAgent) => {
  const user = await prisma.users.findUnique({ where: { email } });
  
  if (!user || user.deleted_at !== null) {
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
  const refreshToken = jwt.sign({ userId: user.id, jti: crypto.randomUUID() }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

  // Lưu phiên vào DB
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.userSessions.create({
    data: {
      user_id: user.id,
      refresh_token_hash: hashToken(refreshToken),
      expires_at: expiresAt,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
    },
  });

  // Loại bỏ password_hash trước khi trả về
  const { password_hash, ...userWithoutPassword } = user;

  return { accessToken, refreshToken, user: userWithoutPassword };
};

/**
 * Refresh token với cơ chế RTR (Atomic)
 */
export const refresh = async (refreshToken) => {
  try {
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const incomingHash = hashToken(refreshToken);

    // Thu hồi token cũ atomic
    const updateResult = await prisma.userSessions.updateMany({
      where: {
        refresh_token_hash: incomingHash,
        revoked_at: null,
        expires_at: { gte: new Date() },
      },
      data: {
        revoked_at: new Date(),
      },
    });

    if (updateResult.count === 0) {
      throw new Error('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    const user = await prisma.users.findUnique({ where: { id: payload.userId } });

    if (!user || !user.is_active || user.deleted_at !== null) {
      throw new Error('Tài khoản không hợp lệ hoặc đã bị khóa');
    }

    // Cấp cặp token mới
    const newPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = jwt.sign(newPayload, JWT_SECRET, { expiresIn: '8h' });
    const newRefreshToken = jwt.sign({ userId: user.id, jti: crypto.randomUUID() }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    // Lưu session mới
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.userSessions.create({
      data: {
        user_id: user.id,
        refresh_token_hash: hashToken(newRefreshToken),
        expires_at: expiresAt,
      },
    });

    return { accessToken, refreshToken: newRefreshToken };
  } catch (error) {
    console.error('Error during refresh:', error);
    throw new Error('Refresh token không hợp lệ hoặc đã hết hạn');
  }
};

/**
 * Đăng xuất và vô hiệu hóa phiên làm việc (Idempotent)
 */
export const revokeSession = async (refreshToken) => {
  try {
    if (!refreshToken) return true;
    const hash = hashToken(refreshToken);
    await prisma.userSessions.updateMany({
      where: {
        refresh_token_hash: hash,
        revoked_at: null,
      },
      data: {
        revoked_at: new Date(),
      },
    });
    return true;
  } catch (error) {
    return true; // Trả về 200 OK im lặng
  }
};

/**
 * Lấy thông tin user hiện tại
 */
export const getMe = async (userId) => {
  const user = await prisma.users.findFirst({
    where: { id: userId, deleted_at: null },
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
  const user = await prisma.users.findFirst({ where: { id: userId, deleted_at: null } });
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
        deleted_at: null,
        OR: [
          { email: { contains: search } },
          { full_name: { contains: search } },
        ],
      }
    : { deleted_at: null };

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
  const existing = await prisma.users.findFirst({ where: { email: data.email, deleted_at: null } });
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
  const user = await prisma.users.findFirst({ where: { id, deleted_at: null } });
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
  const user = await prisma.users.findFirst({ where: { id, deleted_at: null } });
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
