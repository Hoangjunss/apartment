// modules/tenant/frontend/pages/TenantFormPage.jsx
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { FormField } from '@/components/forms/FormField.jsx';
import { GENDER_LABELS } from '@/constants/status.js';
import { useCreateTenant } from '../hooks/useTenant.js';

const schema = z.object({
  full_name: z.string().min(1, 'Họ tên không được để trống').max(100),
  national_id: z.string().min(9, 'CCCD không hợp lệ').max(20),
  national_id_issued_date: z.string().min(1, 'Chọn ngày cấp CCCD'),
  national_id_issued_place: z.string().min(1, 'Nơi cấp không được để trống'),
  date_of_birth: z.string().min(1, 'Chọn ngày sinh'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER'], { required_error: 'Chọn giới tính' }),
  phone: z.string().min(9, 'SĐT không hợp lệ').max(20),
  email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  permanent_address: z.string().min(1, 'Địa chỉ không được để trống'),
  nationality: z.string().default('Việt Nam'),
  occupation: z.string().optional(),
});

export default function TenantFormPage() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { nationality: 'Việt Nam', gender: '' },
  });

  const { mutate: create, isPending } = useCreateTenant({
    onSuccess: (data) => {
      toast.success('Tạo hồ sơ thành công');
      navigate(`/tenants/${data.id}`);
    },
    onError: (err) => {
      const message = err.response?.data?.message || 'Đã có lỗi xảy ra';
      if (err.response?.status === 409) {
        setError('national_id', { message });
      } else {
        toast.error(message);
      }
    },
  });

  return (
    <div>
      <PageHeader title="Tạo hồ sơ khách thuê mới" backUrl="/tenants" />

      <form onSubmit={handleSubmit((d) => create(d))}>
        {/* Thông tin cá nhân */}
        <div className="card p-6 mb-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Thông tin cá nhân</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Họ và tên" required error={errors.full_name?.message}>
              <input {...register('full_name')} id="full-name" className="input" placeholder="Nguyễn Văn A" />
            </FormField>

            <FormField label="Số CCCD" required error={errors.national_id?.message}>
              <input {...register('national_id')} id="national-id" className="input" placeholder="012345678901" />
            </FormField>

            <FormField label="Ngày cấp CCCD" required error={errors.national_id_issued_date?.message}>
              <input {...register('national_id_issued_date')} type="date" id="id-issued-date" className="input" />
            </FormField>

            <FormField label="Nơi cấp CCCD" required error={errors.national_id_issued_place?.message}>
              <input {...register('national_id_issued_place')} id="id-issued-place" className="input" placeholder="Cục CSQLHC về TTXH" />
            </FormField>

            <FormField label="Ngày sinh" required error={errors.date_of_birth?.message}>
              <input {...register('date_of_birth')} type="date" id="dob" className="input" />
            </FormField>

            <FormField label="Giới tính" required error={errors.gender?.message}>
              <select {...register('gender')} id="gender" className="input">
                <option value="">-- Chọn --</option>
                {Object.entries(GENDER_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Số điện thoại" required error={errors.phone?.message}>
              <input {...register('phone')} id="phone" type="tel" className="input" placeholder="0xxxxxxxxx" />
            </FormField>

            <FormField label="Email" error={errors.email?.message}>
              <input {...register('email')} id="email" type="email" className="input" placeholder="email@example.com" />
            </FormField>

            <FormField label="Quốc tịch" error={errors.nationality?.message}>
              <input {...register('nationality')} id="nationality" className="input" />
            </FormField>

            <FormField label="Nghề nghiệp" error={errors.occupation?.message}>
              <input {...register('occupation')} id="occupation" className="input" placeholder="VD: Kỹ sư, Giáo viên..." />
            </FormField>
          </div>

          <div className="mt-4">
            <FormField label="Địa chỉ thường trú" required error={errors.permanent_address?.message}>
              <textarea {...register('permanent_address')} id="permanent-address" className="input" rows={2} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố" />
            </FormField>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/tenants')} className="btn-secondary">
            Hủy
          </button>
          <button type="submit" disabled={isPending || isSubmitting} className="btn-primary" id="submit-tenant-btn">
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang tạo...
              </span>
            ) : (
              'Tạo hồ sơ'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
