// modules/building/frontend/components/ApartmentForm.jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Modal } from '@/components/common/Modal.jsx';
import { FormField } from '@/components/forms/FormField.jsx';
import { ModalFooter } from '@/components/forms/ModalFooter.jsx';
import { useCreateApartment, useUpdateApartment, useBuildings, useFloors, useCheckApartmentCode } from '../hooks/useBuilding.js';
import { ROOM_TYPE_LABELS } from '@/constants/status.js';
import { useState, useEffect } from 'react';

const CAPACITY_RANGES = {
  STUDIO: { min: 1, max: 2, label: '1 - 2 người' },
  ONE_BR: { min: 1, max: 3, label: '1 - 3 người' },
  TWO_BR: { min: 2, max: 5, label: '2 - 5 người' },
  THREE_BR: { min: 3, max: 8, label: '3 - 8 người' },
};

const parseCommas = (str) => {
  if (!str) return 0;
  return Number(String(str).replace(/,/g, ''));
};

const schema = z.object({
  building_id: z.number({ required_error: 'Chọn tòa nhà', invalid_type_error: 'Chọn tòa nhà' }).int().positive(),
  floor_id: z.number({ required_error: 'Chọn tầng', invalid_type_error: 'Chọn tầng' }).int().positive(),
  apartment_code: z.string()
    .min(3, 'Mã căn hộ phải từ 3 đến 10 ký tự')
    .max(10, 'Mã căn hộ phải từ 3 đến 10 ký tự')
    .regex(/^[A-Z0-9-]+$/, 'Chỉ chấp nhận chữ cái, chữ số và dấu gạch ngang'),
  room_type: z.enum(['STUDIO', 'ONE_BR', 'TWO_BR', 'THREE_BR'], { required_error: 'Chọn loại phòng' }),
  area_sqm: z.number({ required_error: 'Nhập diện tích', invalid_type_error: 'Phải là số' })
    .min(10, 'Diện tích tối thiểu 10 m²')
    .max(500, 'Diện tích tối đa 500 m²'),
  max_occupants: z.number({ required_error: 'Nhập sức chứa', invalid_type_error: 'Phải là số' })
    .int()
    .min(1, 'Sức chứa tối thiểu 1 người')
    .max(10, 'Sức chứa tối đa 10 người'),
  base_price: z.number({ required_error: 'Nhập giá cơ bản', invalid_type_error: 'Phải là số' })
    .min(500000, 'Giá thuê tối thiểu phải từ 500.000đ'),
  deposit_amount: z.number({ required_error: 'Nhập tiền đặt cọc', invalid_type_error: 'Phải là số' })
    .min(0, 'Tiền cọc không được nhỏ hơn 0'),
  description: z.string().optional(),
}).refine((data) => data.deposit_amount <= data.base_price, {
  message: 'Tiền đặt cọc không được vượt quá giá thuê cơ bản',
  path: ['deposit_amount'],
});

const editSchema = z.object({
  room_type: z.enum(['STUDIO', 'ONE_BR', 'TWO_BR', 'THREE_BR'], { required_error: 'Chọn loại phòng' }),
  area_sqm: z.number({ invalid_type_error: 'Phải là số' })
    .min(10, 'Diện tích tối thiểu 10 m²')
    .max(500, 'Diện tích tối đa 500 m²'),
  max_occupants: z.number({ invalid_type_error: 'Phải là số' })
    .int()
    .min(1, 'Sức chứa tối thiểu 1 người')
    .max(10, 'Sức chứa tối đa 10 người'),
  base_price: z.number({ invalid_type_error: 'Phải là số' })
    .min(500000, 'Giá thuê tối thiểu phải từ 500.000đ'),
  deposit_amount: z.number({ invalid_type_error: 'Phải là số' })
    .min(0, 'Tiền cọc không được nhỏ hơn 0'),
  description: z.string().optional(),
}).refine((data) => data.deposit_amount <= data.base_price, {
  message: 'Tiền đặt cọc không được vượt quá giá thuê cơ bản',
  path: ['deposit_amount'],
});

export function ApartmentForm({ onClose, apartment }) {
  const isEdit = !!apartment;
  const [selectedBuildingId, setSelectedBuildingId] = useState(
    apartment?.floor?.building_id ?? null,
  );

  const [inputCode, setInputCode] = useState(apartment?.apartment_code ?? '');
  const [debouncedCode, setDebouncedCode] = useState('');

  const [basePriceText, setBasePriceText] = useState(
    apartment?.base_price ? Number(apartment.base_price).toLocaleString('en-US') : ''
  );
  const [depositText, setDepositText] = useState(
    apartment?.deposit_amount ? Number(apartment.deposit_amount).toLocaleString('en-US') : ''
  );

  const { data: buildingsData } = useBuildings({ limit: 100 });
  const { data: floorsData } = useFloors(selectedBuildingId);
  const buildings = buildingsData?.items ?? [];
  const floors = Array.isArray(floorsData) ? floorsData : (floorsData?.items ?? []);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
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
      : {
          apartment_code: '',
          base_price: undefined,
          deposit_amount: undefined,
        },
  });

  // Debounce check code existence
  useEffect(() => {
    if (isEdit) return;
    const handler = setTimeout(() => {
      setDebouncedCode(inputCode);
    }, 500);
    return () => clearTimeout(handler);
  }, [inputCode, isEdit]);

  const { data: isDuplicate } = useCheckApartmentCode(
    debouncedCode,
    apartment?.id,
    !isEdit && debouncedCode.length >= 3 && debouncedCode.length <= 10
  );

  // Register manual inputs
  useEffect(() => {
    if (!isEdit) {
      register('building_id');
      register('floor_id');
      register('apartment_code');
    }
    register('base_price');
    register('deposit_amount');
  }, [register, isEdit]);

  const watchedRoomType = watch('room_type');
  const watchedMaxOccupants = watch('max_occupants');
  const watchedBasePrice = watch('base_price');

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
    if (!isEdit && isDuplicate) {
      toast.error('Mã căn hộ đã tồn tại!');
      return;
    }
    if (isEdit) update(data);
    else create(data);
  };

  const handleCodeChange = (e) => {
    const cleaned = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setInputCode(cleaned);
    setValue('apartment_code', cleaned, { shouldValidate: true });
  };

  // Auto-fill deposit placeholder helper
  const depositPlaceholder = watchedBasePrice
    ? (watchedBasePrice * 2).toLocaleString('en-US')
    : '10,000,000';

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
                  setValue('building_id', val || undefined, { shouldValidate: true });
                  setValue('floor_id', undefined, { shouldValidate: false });
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
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setValue('floor_id', val || undefined, { shouldValidate: true });
                }}
                defaultValue=""
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
            <FormField
              label="Mã căn hộ"
              required
              error={errors.apartment_code?.message || (isDuplicate ? 'Mã căn hộ đã tồn tại' : null)}
            >
              <input
                type="text"
                value={inputCode}
                onChange={handleCodeChange}
                id="apt-code"
                className="input font-mono uppercase"
                placeholder="VD: A-101"
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
            {watchedRoomType && CAPACITY_RANGES[watchedRoomType] && (
              <p className="text-xs text-blue-500 mt-1 font-medium">
                💡 Sức chứa gợi ý: {CAPACITY_RANGES[watchedRoomType].label}
              </p>
            )}
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
            {watchedRoomType && watchedMaxOccupants && CAPACITY_RANGES[watchedRoomType] && (() => {
              const { min, max } = CAPACITY_RANGES[watchedRoomType];
              const occupants = Number(watchedMaxOccupants);
              if (occupants < min || occupants > max) {
                return (
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-1 font-medium flex items-center gap-1">
                    ⚠️ Khuyến nghị: Sức chứa nằm ngoài phạm vi gợi ý ({CAPACITY_RANGES[watchedRoomType].label})
                  </p>
                );
              }
              return null;
            })()}
          </FormField>

          <FormField label="Giá cơ bản (VND)" required error={errors.base_price?.message}>
            <input
              type="text"
              value={basePriceText}
              id="apt-base-price"
              className="input"
              placeholder="5,000,000"
              onFocus={() => {
                const raw = parseCommas(basePriceText);
                setBasePriceText(raw ? String(raw) : '');
              }}
              onBlur={() => {
                const raw = parseCommas(basePriceText);
                setBasePriceText(raw ? raw.toLocaleString('en-US') : '');
              }}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setBasePriceText(val);
                setValue('base_price', Number(val) || undefined, { shouldValidate: true });
              }}
            />
          </FormField>

          <FormField label="Tiền đặt cọc (VND)" required error={errors.deposit_amount?.message}>
            <input
              type="text"
              value={depositText}
              id="apt-deposit"
              className="input"
              placeholder={depositPlaceholder}
              onFocus={() => {
                const raw = parseCommas(depositText);
                setDepositText(raw ? String(raw) : '');
              }}
              onBlur={() => {
                const raw = parseCommas(depositText);
                setDepositText(raw ? raw.toLocaleString('en-US') : '');
              }}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setDepositText(val);
                setValue('deposit_amount', Number(val) || undefined, { shouldValidate: true });
              }}
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
          submitDisabled={!isEdit && (isDuplicate || !!errors.deposit_amount)}
        />
      </form>
    </Modal>
  );
}
