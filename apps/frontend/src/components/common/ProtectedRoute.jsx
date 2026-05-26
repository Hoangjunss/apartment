// src/components/common/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { LoadingSpinner } from './LoadingSpinner.jsx';

/**
 * Bảo vệ route: redirect /login nếu chưa auth.
 * Tuỳ chọn: kiểm tra thêm roles — redirect /dashboard nếu không đủ.
 *
 * @param {string[]} roles - Nếu truyền, chỉ cho phép user có role trong mảng.
 */
export function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingSpinner fullScreen />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
