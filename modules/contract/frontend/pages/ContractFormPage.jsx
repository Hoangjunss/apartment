// modules/contract/frontend/pages/ContractFormPage.jsx
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { FormField } from '@/components/forms/FormField.jsx';
import { useCreateContract } from '../hooks/useContract.js';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/queryKeys.js';
import { api } from '@/lib/axios.js';

const schema = z
  .object({
    tenant_id: z.number({ required_error: 'Chọn khách thuê', invalid_type_error: 'Chọn khách thuê' }).int().positive(),
    apartment_id: z.number({ required_error: 'Chọn căn hộ', invalid_type_error: 'Chọn căn hộ' }).int().positive(),
    start_date: z.string().min(1, 'Chọn ngày bắt đầu'),
    end_date: z.string().min(1, 'Chọn ngày kết thúc'),
    monthly_rent: z.number({ required_error: 'Nhập giá thuê', invalid_type_error: 'Phải là số' }).positive('Giá thuê phải > 0'),
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

// ── Tenant Search Select ───────────────────────────────────────────────────────
function TenantSelect({ value, onChange, error }) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const { data } = useQuery({
    queryKey: QUERY_KEYS.tenants({ search, limit: 10 }),
    queryFn: () => api.get('/tenant/tenants', { params: { search, limit: 10 } }).then(r => r.data.data),
    enabled: isOpen,
  });

  const tenants = data?.items ?? [];
  const selected = tenants.find(t => t.id === value);

  return (
    <div className="relative">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          value={selected ? selected.full_name : search}
          onChange={(e) => { setSearch(e.target.value); onChange(null); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder="Tìm khách thuê theo tên/CCCD..."
          className={`input pl-9 ${error ? 'border-red-400' : ''}`}
          id="tenant-search"
        />
      </div>
      {isOpen && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
          {tenants.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400">Không tìm thấy</p>
          ) : (
            tenants.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => { onChange(t.id); setSearch(t.full_name); setIsOpen(false); }}
                className="flex items-start gap-2 w-full px-3 py-2 text-left hover:bg-gray-50 transition"
                id={`tenant-option-${t.id}`}
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{t.full_name}</p>
                  <p className="text-xs text-gray-400">CCCD: {t.national_id}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
      {isOpen && <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />}
    </div>
  );
}

// ── Apartment Search Select ────────────────────────────────────────────────────
function ApartmentSelect({ value, onChange, error }) {
  const { data } = useQuery({
    queryKey: QUERY_KEYS.apartments({ status: 'AVAILABLE', limit: 100 }),
    queryFn: () => api.get('/building/apartments', { params: { status: 'AVAILABLE', limit: 100 } }).then(r => r.data.data),
  });

  const apartments = data?.items ?? [];

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      className={`input ${error ? 'border-red-400' : ''}`}
      id="apartment-select"
    >
      <option value="">-- Chọn căn hộ (Còn trống) --</option>
      {apartments.map(a => (
        <option key={a.id} value={a.id}>
          {a.apartment_code} — {a.floor?.building?.name} T{a.floor?.floor_number} — {
            new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(a.base_price))
          }/tháng
        </option>
      ))}
    </select>
  );
}

// ── ContractFormPage ───────────────────────────────────────────────────────────
export default function ContractFormPage() {
  const navigate = useNavigate();
  const [tenantId, setTenantId] = useState(null);
  const [apartmentId, setApartmentId] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { payment_due_day: 5 },
  });

  const { mutate: create, isPending } = useCreateContract({
    onSuccess: (data) => {
      toast.success('Tạo hợp đồng thành công');
      navigate(`/contracts/${data.id}`);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Tạo hợp đồng thất bại'),
  });

  const handleTenantChange = useCallback((id) => {
    setTenantId(id);
    setValue('tenant_id', id);
  }, [setValue]);

  const handleApartmentChange = useCallback((id) => {
    setApartmentId(id);
    setValue('apartment_id', id);
  }, [setValue]);

  return (
    <div>
      <PageHeader title="Tạo hợp đồng mới" backUrl="/contracts" />

      <form onSubmit={handleSubmit((d) => create(d))}>
        <div className="card p-6 mb-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Thông tin hợp đồng</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Khách thuê" required error={errors.tenant_id?.message}>
              <TenantSelect
                value={tenantId}
                onChange={handleTenantChange}
                error={errors.tenant_id?.message}
              />
            </FormField>

            <FormField label="Căn hộ" required error={errors.apartment_id?.message}>
              <ApartmentSelect
                value={apartmentId}
                onChange={handleApartmentChange}
                error={errors.apartment_id?.message}
              />
            </FormField>

            <FormField label="Ngày bắt đầu" required error={errors.start_date?.message}>
              <input {...register('start_date')} type="date" id="start-date" className="input" />
            </FormField>

            <FormField label="Ngày kết thúc" required error={errors.end_date?.message}>
              <input {...register('end_date')} type="date" id="end-date" className="input" />
            </FormField>

            <FormField label="Giá thuê/tháng (VND)" required error={errors.monthly_rent?.message}>
              <input
                {...register('monthly_rent', { valueAsNumber: true })}
                type="number"
                id="monthly-rent"
                step="100000"
                placeholder="5000000"
                className="input"
              />
            </FormField>

            <FormField label="Tiền đặt cọc (VND)" error={errors.deposit_amount?.message}>
              <input
                {...register('deposit_amount', { valueAsNumber: true })}
                type="number"
                id="deposit"
                step="100000"
                placeholder="10000000"
                className="input"
              />
            </FormField>

            <FormField label="Ngày đóng tiền (1–28)" required error={errors.payment_due_day?.message}>
              <input
                {...register('payment_due_day', { valueAsNumber: true })}
                type="number"
                id="due-day"
                min={1}
                max={28}
                className="input"
              />
            </FormField>
          </div>

          <div className="mt-4">
            <FormField label="Ghi chú" error={errors.notes?.message}>
              <textarea {...register('notes')} id="contract-notes" className="input" rows={2} placeholder="Điều khoản bổ sung..." />
            </FormField>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/contracts')} className="btn-secondary">
            Hủy
          </button>
          <button type="submit" disabled={isPending} className="btn-primary" id="submit-contract-btn">
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang tạo...
              </span>
            ) : 'Tạo hợp đồng'}
          </button>
        </div>
      </form>
    </div>
  );
}
