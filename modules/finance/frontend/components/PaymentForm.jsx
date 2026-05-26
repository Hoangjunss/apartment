import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Modal } from '@/components/common/Modal.jsx';
import { FormField } from '@/components/forms/FormField.jsx';
import { ModalFooter } from '@/components/forms/ModalFooter.jsx';
import { useRecordPayment } from '../hooks/useFinance.js';

const schema = z.object({
  invoice_id: z.coerce.number().min(1),
  amount: z.coerce.number().min(1, 'Số tiền thanh toán phải lớn hơn 0'),
  payment_method: z.enum(['CASH', 'BANK_TRANSFER'], {
    errorMap: () => ({ message: 'Vui lòng chọn phương thức thanh toán' })
  }),
  payment_date: z.string().min(1, 'Vui lòng chọn ngày thanh toán'),
  reference_number: z.string().optional(),
  note: z.string().optional(),
});

const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function PaymentForm({ onClose, invoice }) {
  const totalPaid = invoice.payments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
  const remainingAmount = Math.max(0, Number(invoice.total_amount) - totalPaid);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      invoice_id: invoice.id,
      amount: remainingAmount,
      payment_method: 'BANK_TRANSFER',
      payment_date: getTodayStr(),
      reference_number: '',
      note: '',
    },
  });

  const { mutate, isPending } = useRecordPayment({
    onSuccess: () => {
      toast.success('Ghi nhận thanh toán thành công');
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Ghi nhận thanh toán thất bại');
    },
  });

  const onSubmit = (data) => mutate(data);

  return (
    <Modal title={`Thanh toán hóa đơn ${invoice.invoice_code}`} onClose={onClose} size="sm">
      <div className="mb-4 space-y-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
        <div className="flex justify-between">
          <span className="text-gray-500">Tổng tiền hóa đơn:</span>
          <span className="font-semibold text-gray-800">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(invoice.total_amount))}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Đã thanh toán:</span>
          <span className="font-semibold text-emerald-600">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalPaid)}
          </span>
        </div>
        <div className="flex justify-between border-t pt-1 border-gray-200">
          <span className="text-gray-500">Còn lại cần thu:</span>
          <span className="font-bold text-rose-600">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(remainingAmount)}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Số tiền thu (VND)" required error={errors.amount?.message}>
          <input
            type="number"
            {...register('amount')}
            className="input"
            id="payment-amount-input"
          />
        </FormField>

        <FormField label="Phương thức thanh toán" required error={errors.payment_method?.message}>
          <select
            {...register('payment_method')}
            className="input"
            id="payment-method-select"
          >
            <option value="BANK_TRANSFER">Chuyển khoản ngân hàng</option>
            <option value="CASH">Tiền mặt</option>
          </select>
        </FormField>

        <FormField label="Ngày thu tiền" required error={errors.payment_date?.message}>
          <input
            type="date"
            {...register('payment_date')}
            className="input"
            id="payment-date-input"
          />
        </FormField>

        <FormField label="Mã giao dịch / Mã tham chiếu" error={errors.reference_number?.message}>
          <input
            type="text"
            placeholder="Ví dụ: FT2614567..."
            {...register('reference_number')}
            className="input"
            id="payment-ref-input"
          />
        </FormField>

        <FormField label="Ghi chú" error={errors.note?.message}>
          <textarea
            {...register('note')}
            className="input"
            rows={2}
            placeholder="Nhập ghi chú thanh toán..."
            id="payment-note-input"
          />
        </FormField>

        <ModalFooter
          onCancel={onClose}
          isLoading={isPending}
          submitLabel="Xác nhận thu tiền"
        />
      </form>
    </Modal>
  );
}
