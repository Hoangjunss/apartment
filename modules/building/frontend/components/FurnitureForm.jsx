// modules/building/frontend/components/FurnitureForm.jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Modal } from '@/components/common/Modal.jsx';
import { FormField } from '@/components/forms/FormField.jsx';
import { ModalFooter } from '@/components/forms/ModalFooter.jsx';
import { useAddFurniture, useUpdateFurniture } from '../hooks/useBuilding.js';
import { FURNITURE_CONDITION_LABELS } from '@/constants/status.js';

const schema = z.object({
  item_name: z.string().min(1, 'Tên không được để trống'),
  quantity: z.number({ invalid_type_error: 'Phải là số' }).int().min(1, 'Tối thiểu 1'),
  condition: z.enum(['NEW', 'GOOD', 'WORN'], { required_error: 'Chọn tình trạng' }),
  note: z.string().optional(),
});

export function FurnitureForm({ onClose, apartmentId, furniture }) {
  const isEdit = !!furniture;

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: furniture
      ? {
          item_name: furniture.item_name,
          quantity: furniture.quantity,
          condition: furniture.condition,
          note: furniture.note ?? '',
        }
      : { quantity: 1, condition: 'NEW' },
  });

  const { mutate: add, isPending: adding } = useAddFurniture(apartmentId, {
    onSuccess: () => { toast.success('Thêm nội thất thành công'); onClose(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Thêm thất bại'),
  });

  const { mutate: update, isPending: updating } = useUpdateFurniture(apartmentId, {
    onSuccess: () => { toast.success('Cập nhật thành công'); onClose(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Cập nhật thất bại'),
  });

  const isPending = adding || updating;

  const onSubmit = (data) => {
    if (isEdit) update({ id: furniture.id, ...data });
    else add(data);
  };

  return (
    <Modal title={isEdit ? 'Sửa nội thất' : 'Thêm nội thất'} onClose={onClose} size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Tên đồ vật" required error={errors.item_name?.message}>
          <input
            {...register('item_name')}
            id="furniture-name"
            className="input"
            placeholder="VD: Máy lạnh, Tủ lạnh..."
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Số lượng" required error={errors.quantity?.message}>
            <input
              {...register('quantity', { valueAsNumber: true })}
              id="furniture-qty"
              type="number"
              min={1}
              className="input"
            />
          </FormField>

          <FormField label="Tình trạng" required error={errors.condition?.message}>
            <select {...register('condition')} id="furniture-condition" className="input">
              {Object.entries(FURNITURE_CONDITION_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label="Ghi chú" error={errors.note?.message}>
          <textarea
            {...register('note')}
            id="furniture-note"
            className="input"
            rows={2}
            placeholder="Ghi chú tình trạng..."
          />
        </FormField>

        <ModalFooter
          onCancel={onClose}
          isLoading={isPending}
          submitLabel={isEdit ? 'Lưu' : 'Thêm'}
        />
      </form>
    </Modal>
  );
}
