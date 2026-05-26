// modules/auth/frontend/pages/LoginPage.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Lock, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useState } from 'react';

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Mật khẩu không được để trống'),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const [apiError, setApiError] = useState('');

  // Redirect nếu đã login
  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    setApiError('');
    try {
      await login(data.email, data.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) {
        setApiError('Sai email hoặc mật khẩu');
      } else if (status === 403) {
        setApiError('Tài khoản đã bị khoá. Vui lòng liên hệ quản trị viên.');
      } else {
        setApiError(err.response?.data?.message || 'Đã có lỗi xảy ra');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg mb-4">
            <Building2 size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">QLCHDC</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý Căn hộ Dịch vụ</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Đăng nhập</h2>

          {/* API Error */}
          {apiError && (
            <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-lg mb-5">
              <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{apiError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="login-form">
            {/* Email */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  {...register('email')}
                  type="email"
                  id="login-email"
                  placeholder="admin@example.com"
                  autoComplete="email"
                  className={`input pl-9 ${errors.email ? 'border-red-400 focus:ring-red-400' : ''}`}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  {...register('password')}
                  type="password"
                  id="login-password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`input pl-9 ${errors.password ? 'border-red-400 focus:ring-red-400' : ''}`}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              id="login-submit-btn"
              disabled={isSubmitting}
              className="btn-primary w-full justify-center py-2.5 mt-2"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang đăng nhập...
                </span>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Hệ thống nội bộ — Chỉ dành cho nhân viên
        </p>
      </div>
    </div>
  );
}
