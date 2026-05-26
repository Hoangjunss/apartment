// modules/building/frontend/components/StatusChangeForm.jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Modal } from '@/components/common/Modal.jsx';
import { FormField } from '@/components/forms/FormField.jsx';
import { ModalFooter } from '@/components/forms/ModalFooter.jsx';
import { useUpdateApartmentStatus } from '../hooks/useBuilding.js';
import {
  APARTMENT_STATUS_CONFIG,
  VALID_APARTMENT_TRANSITIONS,
} from '@/constants/status.js';

const schema = z.object({
  new_status: z.string().min(1, 'Chọn trạng thái mới'),
  reason: z.string().optional(),
});

export function StatusChangeForm({ onClose, apartment }) {
  const allowedNext = VALID_APARTMENT_TRANSITIONS[apartment.status] ?? [];

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { new_status: allowedNext[0] ?? '', reason: '' },
  });

  const { mutate, isPending } = useUpdateApartmentStatus(apartment.id, {
    onSuccess: () => {
      toast.success('Đổi trạng thái thành công');
      onClose();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || 'Đổi trạng thái thất bại'),
  });

  const onSubmit = (data) => mutate(data);

  return (
    <Modal title="Đổi trạng thái căn hộ" onClose={onClose} size="sm">
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-500">Trạng thái hiện tại</p>
        <p className="text-sm font-medium text-gray-800 mt-0.5">
          {APARTMENT_STATUS_CONFIG[apartment.status]?.label ?? apartment.status}
        </p>
      </div>

      {allowedNext.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">
          Không có trạng thái nào để chuyển
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Trạng thái mới" required error={errors.new_status?.message}>
            <select
              {...register('new_status')}
              id="new-status-select"
              className="input"
            >
              {allowedNext.map((s) => (
                <option key={s} value={s}>
                  {APARTMENT_STATUS_CONFIG[s]?.label ?? s}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Lý do (tuỳ chọn)" error={errors.reason?.message}>
            <textarea
              {...register('reason')}
              id="status-reason"
              className="input"
              rows={3}
              placeholder="Lý do đổi trạng thái..."
            />
          </FormField>

          <ModalFooter
            onCancel={onClose}
            isLoading={isPending}
            submitLabel="Xác nhận đổi"
          />
        </form>
      )}
    </Modal>
  );
}
