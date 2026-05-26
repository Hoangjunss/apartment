# Skill: code-form

Dùng skill này khi viết **form tạo mới hoặc chỉnh sửa** bất kỳ entity nào trong dự án.

---

## Stack bắt buộc

- **React Hook Form** — quản lý form state, validation trigger
- **Zod** — định nghĩa schema validation
- **`@hookform/resolvers/zod`** — kết nối Zod với RHF
- **`useMutation` hook** tương ứng — gọi API

---

## Template Form cơ bản (Modal)

```jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/common/Modal.jsx';
import { FormField } from '@/components/forms/FormField.jsx';
import { useCreateEntity } from '../hooks/useEntity.js';

// 1. Định nghĩa schema
const schema = z.object({
  name: z.string().min(1, 'Tên không được để trống').max(100, 'Tên tối đa 100 ký tự'),
  code: z.string().min(1, 'Mã không được để trống'),
  // optional field:
  description: z.string().optional(),
});

// 2. Component
export function EntityForm({ onClose, defaultValues }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,      // dùng để set lỗi từ API (VD: 409 trùng mã)
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? {},
  });

  const { mutate, isPending } = useCreateEntity({
    onSuccess: () => {
      toast.success('Tạo thành công');
      onClose();
    },
    onError: (err) => {
      const message = err.response?.data?.message || 'Đã có lỗi xảy ra';
      // Nếu lỗi 409 liên quan đến field "code" → set field error
      if (err.response?.status === 409 && message.includes('code')) {
        setError('code', { message });
      } else {
        toast.error(message);
      }
    },
  });

  return (
    <Modal title="Thêm mới" onClose={onClose}>
      <form onSubmit={handleSubmit((data) => mutate(data))} className="space-y-4">
        <FormField label="Tên *" error={errors.name?.message}>
          <input
            {...register('name')}
            className="input"
            placeholder="Nhập tên..."
          />
        </FormField>

        <FormField label="Mã *" error={errors.code?.message}>
          <input
            {...register('code')}
            className="input"
            placeholder="VD: BLD-A"
          />
        </FormField>

        <FormField label="Mô tả" error={errors.description?.message}>
          <textarea {...register('description')} className="input" rows={3} />
        </FormField>

        <ModalFooter onCancel={onClose} isLoading={isPending} />
      </form>
    </Modal>
  );
}
```

---

## Component: FormField

```jsx
// src/components/forms/FormField.jsx

export function FormField({ label, error, required, children, hint }) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
```

## Component: ModalFooter

```jsx
export function ModalFooter({ onCancel, isLoading, submitLabel = 'Lưu' }) {
  return (
    <div className="flex justify-end gap-2 pt-2 border-t mt-4">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        Hủy
      </button>
      <button
        type="submit"
        disabled={isLoading}
        className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Đang lưu...
          </span>
        ) : submitLabel}
      </button>
    </div>
  );
}
```

---

## Zod Schemas — Từng Module

### Building — Tạo tòa nhà
```js
export const buildingSchema = z.object({
  code:         z.string().min(1, 'Mã không được để trống').max(20),
  name:         z.string().min(1, 'Tên không được để trống').max(100),
  address:      z.string().min(1, 'Địa chỉ không được để trống'),
  total_floors: z.number({ required_error: 'Số tầng không được để trống' }).int().min(1, 'Tối thiểu 1 tầng'),
  description:  z.string().optional(),
});
```

### Building — Tạo căn hộ
```js
export const apartmentSchema = z.object({
  floor_id:       z.number({ required_error: 'Chọn tầng' }).int().positive(),
  apartment_code: z.string().min(1, 'Mã căn hộ không được để trống').max(20),
  room_type:      z.enum(['STUDIO', 'ONE_BR', 'TWO_BR', 'THREE_BR'], { required_error: 'Chọn loại phòng' }),
  area_sqm:       z.number().positive('Diện tích phải lớn hơn 0'),
  max_occupants:  z.number().int().min(1, 'Tối thiểu 1 người'),
  base_price:     z.number().positive('Giá phải lớn hơn 0'),
  deposit_amount: z.number().positive('Tiền đặt cọc phải lớn hơn 0'),
  description:    z.string().optional(),
});
```

### Building — Đổi trạng thái căn hộ
```js
export const apartmentStatusSchema = z.object({
  new_status: z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE'], {
    required_error: 'Chọn trạng thái mới',
  }),
  reason: z.string().optional(),
});
```

### Tenant — Tạo hồ sơ khách thuê
```js
export const tenantSchema = z.object({
  full_name:               z.string().min(1, 'Họ tên không được để trống').max(100),
  national_id:             z.string().min(9, 'CCCD không hợp lệ').max(20),
  national_id_issued_date: z.string().min(1, 'Chọn ngày cấp CCCD'),
  national_id_issued_place:z.string().min(1, 'Nơi cấp không được để trống'),
  date_of_birth:           z.string().min(1, 'Chọn ngày sinh'),
  gender:                  z.enum(['MALE', 'FEMALE', 'OTHER'], { required_error: 'Chọn giới tính' }),
  phone:                   z.string().min(9, 'Số điện thoại không hợp lệ').max(20),
  email:                   z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  permanent_address:       z.string().min(1, 'Địa chỉ không được để trống'),
  nationality:             z.string().default('Việt Nam'),
  occupation:              z.string().optional(),
});
```

### Contract — Tạo hợp đồng
```js
export const contractSchema = z.object({
  tenant_id:      z.number({ required_error: 'Chọn khách thuê' }).int().positive(),
  apartment_id:   z.number({ required_error: 'Chọn căn hộ' }).int().positive(),
  start_date:     z.string().min(1, 'Chọn ngày bắt đầu'),
  end_date:       z.string().min(1, 'Chọn ngày kết thúc'),
  monthly_rent:   z.number().positive('Giá thuê phải lớn hơn 0'),
  deposit_amount: z.number().positive('Tiền cọc phải lớn hơn 0'),
  payment_due_day:z.number().int().min(1, 'Tối thiểu ngày 1').max(28, 'Tối đa ngày 28'),
  notes:          z.string().optional(),
}).refine(
  (data) => new Date(data.end_date) > new Date(data.start_date),
  { message: 'Ngày kết thúc phải sau ngày bắt đầu', path: ['end_date'] }
);
```

### Contract — Gia hạn hợp đồng
```js
export const renewSchema = z.object({
  new_end_date:     z.string().min(1, 'Chọn ngày kết thúc mới'),
  new_monthly_rent: z.number().positive().optional(),
  notes:            z.string().optional(),
});
```

### Contract — Chấm dứt hợp đồng
```js
export const terminateSchema = z.object({
  termination_reason: z.string().min(1, 'Vui lòng nhập lý do chấm dứt'),
});
```

### Tenant — Khai báo tạm trú/vắng
```js
export const registrationSchema = z.object({
  type:        z.enum(['TEMPORARY_RESIDENCE', 'TEMPORARY_ABSENCE'], { required_error: 'Chọn loại khai báo' }),
  start_date:  z.string().min(1, 'Chọn ngày bắt đầu'),
  end_date:    z.string().min(1, 'Chọn ngày kết thúc'),
  destination: z.string().optional(),
  reason:      z.string().optional(),
}).refine(
  (data) => new Date(data.end_date) >= new Date(data.start_date),
  { message: 'Ngày kết thúc phải từ ngày bắt đầu trở đi', path: ['end_date'] }
);
```

---

## Form 2 cột (Page Form — không phải Modal)

```jsx
// TenantFormPage.jsx — Form trang đầy đủ
import { useNavigate } from 'react-router-dom';

export default function TenantFormPage() {
  const navigate = useNavigate();
  const { mutate: create, isPending } = useCreateTenant({
    onSuccess: (data) => {
      toast.success('Tạo hồ sơ thành công');
      navigate(`/tenants/${data.id}`);
    },
    onError: (err) => {
      const message = err.response?.data?.message || 'Đã có lỗi';
      if (err.response?.status === 409) {
        setError('national_id', { message });
      } else {
        toast.error(message);
      }
    },
  });

  return (
    <div>
      <PageHeader title="Tạo hồ sơ khách thuê mới" backUrl="/tenants" />

      <form onSubmit={handleSubmit((data) => create(data))}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-base font-medium text-gray-900 mb-4">Thông tin cá nhân</h2>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Họ và tên *" error={errors.full_name?.message}>
              <input {...register('full_name')} className="input" />
            </FormField>
            <FormField label="Số CCCD *" error={errors.national_id?.message}>
              <input {...register('national_id')} className="input" />
            </FormField>
            <FormField label="Ngày cấp CCCD *" error={errors.national_id_issued_date?.message}>
              <input {...register('national_id_issued_date')} type="date" className="input" />
            </FormField>
            <FormField label="Nơi cấp *" error={errors.national_id_issued_place?.message}>
              <input {...register('national_id_issued_place')} className="input" />
            </FormField>
            <FormField label="Ngày sinh *" error={errors.date_of_birth?.message}>
              <input {...register('date_of_birth')} type="date" className="input" />
            </FormField>
            <FormField label="Giới tính *" error={errors.gender?.message}>
              <select {...register('gender')} className="input">
                <option value="">-- Chọn --</option>
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </FormField>
            <FormField label="Số điện thoại *" error={errors.phone?.message}>
              <input {...register('phone')} className="input" type="tel" />
            </FormField>
            <FormField label="Email" error={errors.email?.message}>
              <input {...register('email')} className="input" type="email" />
            </FormField>
          </div>

          <div className="mt-4">
            <FormField label="Địa chỉ thường trú *" error={errors.permanent_address?.message}>
              <textarea {...register('permanent_address')} className="input" rows={2} />
            </FormField>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button type="button" onClick={() => navigate('/tenants')} className="btn-secondary">
            Hủy
          </button>
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? 'Đang tạo...' : 'Tạo hồ sơ'}
          </button>
        </div>
      </form>
    </div>
  );
}
```

---

## CSS Classes chuẩn (Tailwind)

```css
/* Thêm vào index.css hoặc dùng trực tiếp */
.input {
  @apply w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
         placeholder:text-gray-400;
}

.btn-primary {
  @apply px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg
         hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition;
}

.btn-secondary {
  @apply px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300
         rounded-lg hover:bg-gray-50 transition;
}

.btn-danger {
  @apply px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg
         hover:bg-red-700 disabled:opacity-60 transition;
}
```

---

## Checklist Form

- [ ] Schema Zod định nghĩa đúng type (number/string/enum) và message tiếng Việt
- [ ] Required fields đánh dấu `*` trong label
- [ ] Xử lý lỗi 409 (trùng unique) → `setError` vào field, không toast
- [ ] Xử lý lỗi khác → `toast.error(message từ API)`
- [ ] Nút Submit disable khi `isPending`
- [ ] Form Edit: truyền `defaultValues` từ data API
- [ ] Date input dùng `type="date"` (trả về `YYYY-MM-DD`)
- [ ] Number input (tiền, diện tích): dùng `valueAsNumber: true` trong register
  ```jsx
  <input {...register('monthly_rent', { valueAsNumber: true })} type="number" />
  ```
