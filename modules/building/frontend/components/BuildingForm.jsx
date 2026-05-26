// modules/building/frontend/components/BuildingForm.jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Modal } from '@/components/common/Modal.jsx';
import { FormField } from '@/components/forms/FormField.jsx';
import { ModalFooter } from '@/components/forms/ModalFooter.jsx';
import { useCreateBuilding, useUpdateBuilding } from '../hooks/useBuilding.js';

const schema = z.object({
  code: z.string().min(1, 'Mã không được để trống').max(20),
  name: z.string().min(1, 'Tên không được để trống').max(100),
  address: z.string().min(1, 'Địa chỉ không được để trống'),
  total_floors: z
    .number({ required_error: 'Số tầng không được để trống', invalid_type_error: 'Phải là số' })
    .int()
    .min(1, 'Tối thiểu 1 tầng'),
  description: z.string().optional(),
});

export function BuildingForm({ onClose, building }) {
  const isEdit = !!building;

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: building
      ? {
          code: building.code,
          name: building.name,
          address: building.address,
          total_floors: building.total_floors,
          description: building.description ?? '',
        }
      : {},
  });

  const { mutate: create, isPending: creating } = useCreateBuilding({
    onSuccess: () => { toast.success('Tạo tòa nhà thành công'); onClose(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Tạo thất bại'),
  });

  const { mutate: update, isPending: updating } = useUpdateBuilding(building?.id, {
    onSuccess: () => { toast.success('Cập nhật thành công'); onClose(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Cập nhật thất bại'),
  });

  const isPending = creating || updating;

  const onSubmit = (data) => {
    if (isEdit) update(data);
    else create(data);
  };

  return (
    <Modal title={isEdit ? 'Sửa thông tin tòa nhà' : 'Thêm tòa nhà mới'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Mã tòa nhà" required error={errors.code?.message}>
            <input
              {...register('code')}
              id="building-code"
              className="input"
              placeholder="VD: BLD-A"
              disabled={isEdit}
            />
          </FormField>

          <FormField label="Số tầng" required error={errors.total_floors?.message}>
            <input
              {...register('total_floors', { valueAsNumber: true })}
              id="building-floors"
              type="number"
              min={1}
              className="input"
              placeholder="10"
            />
          </FormField>
        </div>

        <FormField label="Tên tòa nhà" required error={errors.name?.message}>
          <input
            {...register('name')}
            id="building-name"
            className="input"
            placeholder="Tòa nhà A"
          />
        </FormField>

        <FormField label="Địa chỉ" required error={errors.address?.message}>
          <input
            {...register('address')}
            id="building-address"
            className="input"
            placeholder="123 Đường ABC, Quận X, TP.HCM"
          />
        </FormField>

        <FormField label="Mô tả" error={errors.description?.message}>
          <textarea
            {...register('description')}
            id="building-description"
            className="input"
            rows={3}
            placeholder="Mô tả thêm về tòa nhà..."
          />
        </FormField>

        <ModalFooter
          onCancel={onClose}
          isLoading={isPending}
          submitLabel={isEdit ? 'Lưu' : 'Tạo tòa nhà'}
        />
      </form>
    </Modal>
  );
}
