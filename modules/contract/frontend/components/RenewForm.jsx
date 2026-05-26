// modules/contract/frontend/components/RenewForm.jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Modal } from '@/components/common/Modal.jsx';
import { FormField } from '@/components/forms/FormField.jsx';
import { ModalFooter } from '@/components/forms/ModalFooter.jsx';
import { useRenewContract } from '../hooks/useContract.js';
import { format, parseISO } from 'date-fns';

const schema = z.object({
  new_end_date: z.string().min(1, 'Chọn ngày kết thúc mới'),
  new_monthly_rent: z
    .number({ invalid_type_error: 'Phải là số' })
    .positive()
    .optional()
    .or(z.nan()),
  notes: z.string().optional(),
});

export function RenewForm({ onClose, contract }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      new_end_date: '',
      new_monthly_rent: Number(contract.monthly_rent),
      notes: '',
    },
  });

  const { mutate, isPending } = useRenewContract(contract.id, {
    onSuccess: () => { toast.success('Gia hạn thành công'); onClose(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Gia hạn thất bại'),
  });

  const onSubmit = (data) => {
    const payload = {
      new_end_date: data.new_end_date,
      notes: data.notes || undefined,
    };
    if (data.new_monthly_rent && !isNaN(data.new_monthly_rent)) {
      payload.new_monthly_rent = data.new_monthly_rent;
    }
    mutate(payload);
  };

  return (
    <Modal title="Gia hạn hợp đồng" onClose={onClose}>
      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-xs text-blue-600">Ngày kết thúc hiện tại:</p>
        <p className="text-sm font-medium text-blue-800">
          {format(parseISO(contract.end_date), 'dd/MM/yyyy')}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Ngày kết thúc mới" required error={errors.new_end_date?.message}>
          <input
            {...register('new_end_date')}
            type="date"
            id="renew-end-date"
            className="input"
            min={contract.end_date}
          />
        </FormField>

        <FormField
          label="Giá thuê mới (VND)"
          error={errors.new_monthly_rent?.message}
          hint="Để trống nếu giữ nguyên giá cũ"
        >
          <input
            {...register('new_monthly_rent', { valueAsNumber: true })}
            type="number"
            id="renew-rent"
            step="100000"
            className="input"
          />
        </FormField>

        <FormField label="Ghi chú" error={errors.notes?.message}>
          <textarea
            {...register('notes')}
            id="renew-notes"
            className="input"
            rows={2}
            placeholder="Ghi chú về việc gia hạn..."
          />
        </FormField>

        <ModalFooter onCancel={onClose} isLoading={isPending} submitLabel="Xác nhận gia hạn" />
      </form>
    </Modal>
  );
}
