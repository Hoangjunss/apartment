// modules/building/frontend/components/ApartmentForm.jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Modal } from '@/components/common/Modal.jsx';
import { FormField } from '@/components/forms/FormField.jsx';
import { ModalFooter } from '@/components/forms/ModalFooter.jsx';
import { useCreateApartment, useUpdateApartment, useBuildings, useFloors } from '../hooks/useBuilding.js';
import { ROOM_TYPE_LABELS } from '@/constants/status.js';
import { useState } from 'react';

const schema = z.object({
  building_id: z.number({ required_error: 'Chọn tòa nhà', invalid_type_error: 'Chọn tòa nhà' }).int().positive(),
  floor_id: z.number({ required_error: 'Chọn tầng', invalid_type_error: 'Chọn tầng' }).int().positive(),
  apartment_code: z.string().min(1, 'Mã căn hộ không được để trống').max(20),
  room_type: z.enum(['STUDIO', 'ONE_BR', 'TWO_BR', 'THREE_BR'], { required_error: 'Chọn loại phòng' }),
  area_sqm: z.number({ required_error: 'Nhập diện tích', invalid_type_error: 'Phải là số' }).positive('Diện tích phải > 0'),
  max_occupants: z.number({ invalid_type_error: 'Phải là số' }).int().min(1, 'Tối thiểu 1 người'),
  base_price: z.number({ required_error: 'Nhập giá', invalid_type_error: 'Phải là số' }).positive('Giá phải > 0'),
  deposit_amount: z.number({ invalid_type_error: 'Phải là số' }).positive('Tiền cọc phải > 0'),
  description: z.string().optional(),
});

const editSchema = z.object({
  room_type: z.enum(['STUDIO', 'ONE_BR', 'TWO_BR', 'THREE_BR'], { required_error: 'Chọn loại phòng' }),
  area_sqm: z.number({ invalid_type_error: 'Phải là số' }).positive('Diện tích phải > 0'),
  max_occupants: z.number({ invalid_type_error: 'Phải là số' }).int().min(1),
  base_price: z.number({ invalid_type_error: 'Phải là số' }).positive(),
  deposit_amount: z.number({ invalid_type_error: 'Phải là số' }).positive(),
  description: z.string().optional(),
});

export function ApartmentForm({ onClose, apartment }) {
  const isEdit = !!apartment;
  const [selectedBuildingId, setSelectedBuildingId] = useState(
    apartment?.floor?.building_id ?? null,
  );

  const { data: buildingsData } = useBuildings({ limit: 100 });
  const { data: floorsData } = useFloors(selectedBuildingId);
  const buildings = buildingsData?.items ?? [];
  const floors = Array.isArray(floorsData) ? floorsData : (floorsData?.items ?? []);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(isEdit ? editSchema : schema),
    defaultValues: apartment
      ? {
          room_type: apartment.room_type,
          area_sqm: Number(apartment.area_sqm),
          max_occupants: apartment.max_occupants,
          base_price: Number(apartment.base_price),
          deposit_amount: Number(apartment.deposit_amount),
          description: apartment.description ?? '',
        }
      : {},
  });

  const { mutate: create, isPending: creating } = useCreateApartment({
    onSuccess: () => { toast.success('Tạo căn hộ thành công'); onClose(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Tạo thất bại'),
  });

  const { mutate: update, isPending: updating } = useUpdateApartment(apartment?.id, {
    onSuccess: () => { toast.success('Cập nhật thành công'); onClose(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Cập nhật thất bại'),
  });

  const isPending = creating || updating;

  const onSubmit = (data) => {
    if (isEdit) update(data);
    else create(data);
  };

  return (
    <Modal title={isEdit ? 'Sửa thông tin căn hộ' : 'Thêm căn hộ mới'} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {!isEdit && (
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Tòa nhà" required error={errors.building_id?.message}>
              <select
                id="apt-building"
                className="input"
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setValue('building_id', val);
                  setValue('floor_id', undefined);
                  setSelectedBuildingId(val || null);
                }}
              >
                <option value="">-- Chọn tòa nhà --</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Tầng" required error={errors.floor_id?.message}>
              <select
                id="apt-floor"
                className="input"
                disabled={!selectedBuildingId}
                {...register('floor_id', { valueAsNumber: true })}
              >
                <option value="">-- Chọn tầng --</option>
                {floors.map((f) => (
                  <option key={f.id} value={f.id}>Tầng {f.floor_number}</option>
                ))}
              </select>
            </FormField>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {!isEdit && (
            <FormField label="Mã căn hộ" required error={errors.apartment_code?.message}>
              <input
                {...register('apartment_code')}
                id="apt-code"
                className="input"
                placeholder="VD: A101"
              />
            </FormField>
          )}

          <FormField label="Loại phòng" required error={errors.room_type?.message}>
            <select {...register('room_type')} id="apt-room-type" className="input">
              <option value="">-- Chọn loại --</option>
              {Object.entries(ROOM_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Diện tích (m²)" required error={errors.area_sqm?.message}>
            <input
              {...register('area_sqm', { valueAsNumber: true })}
              id="apt-area"
              type="number"
              step="0.5"
              className="input"
              placeholder="35"
            />
          </FormField>

          <FormField label="Sức chứa tối đa" error={errors.max_occupants?.message}>
            <input
              {...register('max_occupants', { valueAsNumber: true })}
              id="apt-max-occ"
              type="number"
              min={1}
              className="input"
              placeholder="2"
            />
          </FormField>

          <FormField label="Giá cơ bản (VND)" required error={errors.base_price?.message}>
            <input
              {...register('base_price', { valueAsNumber: true })}
              id="apt-base-price"
              type="number"
              step="100000"
              className="input"
              placeholder="5000000"
            />
          </FormField>

          <FormField label="Tiền đặt cọc (VND)" error={errors.deposit_amount?.message}>
            <input
              {...register('deposit_amount', { valueAsNumber: true })}
              id="apt-deposit"
              type="number"
              step="100000"
              className="input"
              placeholder="10000000"
            />
          </FormField>
        </div>

        <FormField label="Mô tả" error={errors.description?.message}>
          <textarea
            {...register('description')}
            id="apt-description"
            className="input"
            rows={2}
            placeholder="Mô tả thêm..."
          />
        </FormField>

        <ModalFooter
          onCancel={onClose}
          isLoading={isPending}
          submitLabel={isEdit ? 'Lưu' : 'Tạo căn hộ'}
        />
      </form>
    </Modal>
  );
}
