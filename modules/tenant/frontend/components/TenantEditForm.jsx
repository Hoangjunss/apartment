// modules/tenant/frontend/components/TenantEditForm.jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Modal } from '@/components/common/Modal.jsx';
import { FormField } from '@/components/forms/FormField.jsx';
import { ModalFooter } from '@/components/forms/ModalFooter.jsx';
import { useUpdateTenant } from '../hooks/useTenant.js';
import { GENDER_LABELS } from '@/constants/status.js';

const schema = z.object({
  full_name: z.string().min(1, 'Họ tên không được để trống').max(100),
  phone: z.string().min(9, 'SĐT không hợp lệ').max(20),
  email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  permanent_address: z.string().min(1, 'Địa chỉ không được để trống'),
  nationality: z.string().default('Việt Nam'),
  occupation: z.string().optional(),
});

export function TenantEditForm({ onClose, tenant }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: tenant.full_name,
      phone: tenant.phone,
      email: tenant.email ?? '',
      permanent_address: tenant.permanent_address,
      nationality: tenant.nationality ?? 'Việt Nam',
      occupation: tenant.occupation ?? '',
    },
  });

  const { mutate, isPending } = useUpdateTenant(tenant.id, {
    onSuccess: () => { toast.success('Cập nhật thành công'); onClose(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Cập nhật thất bại'),
  });

  return (
    <Modal title="Sửa hồ sơ khách thuê" onClose={onClose} size="lg">
      <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Họ và tên" required error={errors.full_name?.message}>
            <input {...register('full_name')} id="edit-full-name" className="input" />
          </FormField>
          <FormField label="Số điện thoại" required error={errors.phone?.message}>
            <input {...register('phone')} id="edit-phone" className="input" type="tel" />
          </FormField>
          <FormField label="Email" error={errors.email?.message}>
            <input {...register('email')} id="edit-email" className="input" type="email" />
          </FormField>
          <FormField label="Quốc tịch" error={errors.nationality?.message}>
            <input {...register('nationality')} id="edit-nationality" className="input" />
          </FormField>
          <FormField label="Nghề nghiệp" error={errors.occupation?.message}>
            <input {...register('occupation')} id="edit-occupation" className="input" placeholder="VD: Kỹ sư phần mềm" />
          </FormField>
        </div>

        <FormField label="Địa chỉ thường trú" required error={errors.permanent_address?.message}>
          <textarea {...register('permanent_address')} id="edit-address" className="input" rows={2} />
        </FormField>

        <ModalFooter onCancel={onClose} isLoading={isPending} />
      </form>
    </Modal>
  );
}
