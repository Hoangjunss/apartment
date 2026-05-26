// modules/auth/frontend/pages/ProfilePage.jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { KeyRound } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { FormField } from '@/components/forms/FormField.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useChangePassword } from '../hooks/useAuth.js';
import { ROLE_LABELS } from '@/constants/roles.js';

const schema = z
  .object({
    oldPassword: z.string().min(1, 'Nhập mật khẩu hiện tại'),
    newPassword: z.string().min(6, 'Mật khẩu mới tối thiểu 6 ký tự'),
    confirmPassword: z.string().min(1, 'Xác nhận mật khẩu'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

export default function ProfilePage() {
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const { mutate: changePassword, isPending } = useChangePassword({
    onSuccess: () => {
      toast.success('Đổi mật khẩu thành công');
      reset();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Đổi mật khẩu thất bại');
    },
  });

  const onSubmit = (data) => {
    changePassword({ oldPassword: data.oldPassword, newPassword: data.newPassword });
  };

  return (
    <div>
      <PageHeader title="Hồ sơ cá nhân" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Thông tin user */}
        <div className="card p-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold mb-3">
              {user?.full_name?.charAt(0)?.toUpperCase()}
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{user?.full_name}</h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className="mt-2 badge bg-blue-100 text-blue-700">
              {ROLE_LABELS[user?.role] ?? user?.role}
            </span>
          </div>

          <div className="mt-6 space-y-3 border-t border-gray-100 pt-4">
            <div>
              <p className="info-label">Email</p>
              <p className="info-value">{user?.email}</p>
            </div>
            <div>
              <p className="info-label">Vai trò</p>
              <p className="info-value">{ROLE_LABELS[user?.role] ?? user?.role}</p>
            </div>
          </div>
        </div>

        {/* Đổi mật khẩu */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <KeyRound size={18} className="text-gray-500" />
            <h3 className="text-base font-semibold text-gray-900">Đổi mật khẩu</h3>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
            <FormField label="Mật khẩu hiện tại" required error={errors.oldPassword?.message}>
              <input
                {...register('oldPassword')}
                type="password"
                id="old-password"
                className="input"
                placeholder="Nhập mật khẩu hiện tại"
              />
            </FormField>

            <FormField label="Mật khẩu mới" required error={errors.newPassword?.message}>
              <input
                {...register('newPassword')}
                type="password"
                id="new-password"
                className="input"
                placeholder="Tối thiểu 6 ký tự"
              />
            </FormField>

            <FormField label="Xác nhận mật khẩu mới" required error={errors.confirmPassword?.message}>
              <input
                {...register('confirmPassword')}
                type="password"
                id="confirm-password"
                className="input"
                placeholder="Nhập lại mật khẩu mới"
              />
            </FormField>

            <button
              type="submit"
              disabled={isPending}
              className="btn-primary"
              id="change-password-btn"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang đổi...
                </span>
              ) : (
                'Đổi mật khẩu'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
