// modules/tenant/frontend/components/RegistrationForm.jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Modal } from '@/components/common/Modal.jsx';
import { FormField } from '@/components/forms/FormField.jsx';
import { ModalFooter } from '@/components/forms/ModalFooter.jsx';
import { useCreateRegistration } from '../hooks/useTenant.js';
import { REGISTRATION_TYPE_LABELS } from '@/constants/status.js';

const schema = z
  .object({
    type: z.enum(['TEMPORARY_RESIDENCE', 'TEMPORARY_ABSENCE'], {
      required_error: 'Chọn loại khai báo',
    }),
    start_date: z.string().min(1, 'Chọn ngày bắt đầu'),
    end_date: z.string().min(1, 'Chọn ngày kết thúc'),
    destination: z.string().optional(),
    reason: z.string().optional(),
  })
  .refine((d) => new Date(d.end_date) >= new Date(d.start_date), {
    message: 'Ngày kết thúc phải từ ngày bắt đầu trở đi',
    path: ['end_date'],
  });

export function RegistrationForm({ onClose, tenantId }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { type: 'TEMPORARY_RESIDENCE' },
  });

  const type = watch('type');

  const { mutate, isPending } = useCreateRegistration(tenantId, {
    onSuccess: () => { toast.success('Tạo khai báo thành công'); onClose(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Tạo thất bại'),
  });

  return (
    <Modal title="Tạo khai báo tạm trú/vắng" onClose={onClose}>
      <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4">
        <FormField label="Loại khai báo" required error={errors.type?.message}>
          <select {...register('type')} id="reg-type" className="input">
            {Object.entries(REGISTRATION_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Ngày bắt đầu" required error={errors.start_date?.message}>
            <input {...register('start_date')} type="date" id="reg-start" className="input" />
          </FormField>
          <FormField label="Ngày kết thúc" required error={errors.end_date?.message}>
            <input {...register('end_date')} type="date" id="reg-end" className="input" />
          </FormField>
        </div>

        {type === 'TEMPORARY_ABSENCE' && (
          <FormField label="Địa điểm đến" error={errors.destination?.message}>
            <input
              {...register('destination')}
              id="reg-destination"
              className="input"
              placeholder="Địa điểm đến..."
            />
          </FormField>
        )}

        <FormField label="Lý do" error={errors.reason?.message}>
          <textarea
            {...register('reason')}
            id="reg-reason"
            className="input"
            rows={2}
            placeholder="Lý do khai báo..."
          />
        </FormField>

        <ModalFooter onCancel={onClose} isLoading={isPending} submitLabel="Tạo khai báo" />
      </form>
    </Modal>
  );
}
