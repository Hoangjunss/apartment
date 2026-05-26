// modules/contract/frontend/components/ContractEditForm.jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Modal } from '@/components/common/Modal.jsx';
import { FormField } from '@/components/forms/FormField.jsx';
import { ModalFooter } from '@/components/forms/ModalFooter.jsx';
import { useUpdateContract } from '../hooks/useContract.js';

const schema = z
  .object({
    start_date: z.string().min(1, 'Chọn ngày bắt đầu'),
    end_date: z.string().min(1, 'Chọn ngày kết thúc'),
    monthly_rent: z.number({ invalid_type_error: 'Phải là số' }).positive('Giá thuê phải > 0'),
    deposit_amount: z.number({ invalid_type_error: 'Phải là số' }).positive(),
    payment_due_day: z
      .number({ invalid_type_error: 'Phải là số' })
      .int()
      .min(1, 'Tối thiểu ngày 1')
      .max(28, 'Tối đa ngày 28'),
    notes: z.string().optional(),
  })
  .refine((d) => new Date(d.end_date) > new Date(d.start_date), {
    message: 'Ngày kết thúc phải sau ngày bắt đầu',
    path: ['end_date'],
  });

export function ContractEditForm({ onClose, contract }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      start_date: contract.start_date?.split('T')[0],
      end_date: contract.end_date?.split('T')[0],
      monthly_rent: Number(contract.monthly_rent),
      deposit_amount: Number(contract.deposit_amount),
      payment_due_day: contract.payment_due_day,
      notes: contract.notes ?? '',
    },
  });

  const { mutate, isPending } = useUpdateContract(contract.id, {
    onSuccess: () => { toast.success('Cập nhật thành công'); onClose(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Cập nhật thất bại'),
  });

  return (
    <Modal title="Sửa điều khoản hợp đồng" onClose={onClose} size="lg">
      <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Ngày bắt đầu" required error={errors.start_date?.message}>
            <input {...register('start_date')} type="date" id="edit-start" className="input" />
          </FormField>
          <FormField label="Ngày kết thúc" required error={errors.end_date?.message}>
            <input {...register('end_date')} type="date" id="edit-end" className="input" />
          </FormField>
          <FormField label="Giá thuê/tháng (VND)" required error={errors.monthly_rent?.message}>
            <input
              {...register('monthly_rent', { valueAsNumber: true })}
              type="number"
              id="edit-rent"
              step="100000"
              className="input"
            />
          </FormField>
          <FormField label="Tiền đặt cọc (VND)" error={errors.deposit_amount?.message}>
            <input
              {...register('deposit_amount', { valueAsNumber: true })}
              type="number"
              id="edit-deposit"
              step="100000"
              className="input"
            />
          </FormField>
          <FormField label="Ngày đóng tiền (1–28)" required error={errors.payment_due_day?.message}>
            <input
              {...register('payment_due_day', { valueAsNumber: true })}
              type="number"
              id="edit-due-day"
              min={1}
              max={28}
              className="input"
            />
          </FormField>
        </div>

        <FormField label="Ghi chú" error={errors.notes?.message}>
          <textarea {...register('notes')} id="edit-notes" className="input" rows={2} />
        </FormField>

        <ModalFooter onCancel={onClose} isLoading={isPending} />
      </form>
    </Modal>
  );
}
