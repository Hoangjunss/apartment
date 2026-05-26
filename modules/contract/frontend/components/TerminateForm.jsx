// modules/contract/frontend/components/TerminateForm.jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Modal } from '@/components/common/Modal.jsx';
import { FormField } from '@/components/forms/FormField.jsx';
import { ModalFooter } from '@/components/forms/ModalFooter.jsx';
import { useTerminateContract } from '../hooks/useContract.js';

const schema = z.object({
  termination_reason: z.string().min(1, 'Vui lòng nhập lý do chấm dứt'),
});

export function TerminateForm({ onClose, contract }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const { mutate, isPending } = useTerminateContract(contract.id, {
    onSuccess: () => { toast.success('Đã chấm dứt hợp đồng'); onClose(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Chấm dứt thất bại'),
  });

  return (
    <Modal title="Chấm dứt hợp đồng sớm" onClose={onClose} size="sm">
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
        <p className="text-sm text-red-700">
          Hành động này không thể hoàn tác. Hợp đồng sẽ bị chấm dứt và căn hộ sẽ được chuyển về trạng thái <strong>Còn trống</strong>.
        </p>
      </div>

      <form onSubmit={handleSubmit((d) => mutate(d.termination_reason))} className="space-y-4">
        <FormField label="Lý do chấm dứt" required error={errors.termination_reason?.message}>
          <textarea
            {...register('termination_reason')}
            id="terminate-reason"
            className="input"
            rows={3}
            placeholder="Nhập lý do chấm dứt hợp đồng sớm..."
          />
        </FormField>

        <ModalFooter
          onCancel={onClose}
          isLoading={isPending}
          submitLabel="Xác nhận chấm dứt"
          submitVariant="danger"
        />
      </form>
    </Modal>
  );
}
