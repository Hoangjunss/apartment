// src/components/common/RoleGuard.jsx
import { useAuth } from '@/contexts/AuthContext.jsx';

/**
 * Ẩn children nếu user không có role trong danh sách.
 * Render null — không disabled, không hiện "forbidden".
 *
 * @param {string[]} roles - Danh sách roles được phép thấy children.
 */
export function RoleGuard({ roles, children }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return null;
  return children;
}
