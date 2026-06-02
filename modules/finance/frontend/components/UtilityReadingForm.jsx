import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios.js';
import { Modal } from '@/components/common/Modal.jsx';
import { FormField } from '@/components/forms/FormField.jsx';
import { ModalFooter } from '@/components/forms/ModalFooter.jsx';
import { useRecordUtility } from '../hooks/useFinance.js';
import { useApartments } from 'modules/building/frontend/hooks/useBuilding.js';
import { useContracts } from 'modules/contract/frontend/hooks/useContract.js';
import { WATER_PRICE_PER_PERSON } from '@/constants/finance.js';

const schema = z.object({
  apartment_id: z.coerce.number().min(1, 'Vui lòng chọn căn hộ'),
  billing_month: z.string().regex(/^\d{4}-\d{2}$/, 'Tháng không hợp lệ (định dạng YYYY-MM)'),
  electricity_curr: z.coerce.number().min(0, 'Chỉ số điện hiện tại không được nhỏ hơn 0'),
  soNguoiO: z.coerce.number().min(1, 'Số người ở tối thiểu là 1'),
  electricity_unit_price: z.coerce.number().min(0, 'Đơn giá điện không được nhỏ hơn 0'),
  water_unit_price: z.coerce.number().optional(),
});

const getCurrentMonthStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export function UtilityReadingForm({ onClose, preselectedApartmentId }) {
  const { data: apartmentsData } = useApartments({ limit: 100 });
  const allApartments = apartmentsData?.items ?? [];

  const { data: contractsData } = useContracts({ status: 'ACTIVE', limit: 100 });
  const activeContracts = contractsData?.items ?? [];

  // Chỉ hiển thị các phòng đang có hợp đồng đang hoạt động (ACTIVE)
  const apartments = allApartments.filter(apt =>
    activeContracts.some(c => Number(c.apartment_id) === Number(apt.id))
  );

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      apartment_id: preselectedApartmentId ?? '',
      billing_month: getCurrentMonthStr(),
      electricity_curr: '',
      soNguoiO: 1,
      electricity_unit_price: 3500,
      water_unit_price: WATER_PRICE_PER_PERSON,
    },
  });

  const selectedAptId = watch('apartment_id');
  const soNguoiO = watch('soNguoiO') ?? 1;

  // Lấy chỉ số điện nước cuối cùng của phòng được chọn
  const { data: latestReading } = useQuery({
    queryKey: ['utility-readings', 'latest', selectedAptId],
    queryFn: () => api.get('/finance/utilities', { params: { apartment_id: selectedAptId, limit: 1 } }).then(r => r.data.data?.items?.[0] ?? null),
    enabled: !!selectedAptId,
  });

  const matchedContract = activeContracts.find(c => Number(c.apartment_id) === Number(selectedAptId));
  const initialElectricity = matchedContract ? Number(matchedContract.initial_electricity) : 0;

  // Chỉ số điện cũ = chỉ số điện mới của tháng trước, hoặc chỉ số điện ban đầu của hợp đồng
  const prevElectricityIndex = latestReading ? Number(latestReading.electricity_curr) : initialElectricity;

  // Tự động điền số người ở và đơn giá điện từ hợp đồng hoạt động
  useEffect(() => {
    if (selectedAptId && activeContracts.length > 0) {
      const matched = activeContracts.find(c => Number(c.apartment_id) === Number(selectedAptId));
      if (matched) {
        setValue('soNguoiO', matched.soNguoiO || matched.occupants_count || 1);
        setValue('electricity_unit_price', matched.electricity_price ? Number(matched.electricity_price) : 3500);
      }
    }
  }, [selectedAptId, activeContracts, setValue]);

  const { mutate, isPending } = useRecordUtility({
    onSuccess: () => {
      toast.success('Ghi nhận số điện nước thành công');
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi khi ghi nhận số điện nước');
    },
  });

  const onSubmit = (data) => mutate(data);

  return (
    <Modal title="Ghi nhận số điện & nước" onClose={onClose} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Căn hộ" required error={errors.apartment_id?.message}>
          {preselectedApartmentId ? (
            <select
              {...register('apartment_id')}
              className="input bg-gray-50 cursor-not-allowed"
              disabled
              id="apt-id-select"
            >
              {apartments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.apartment_code} - {a.floor?.building?.name}
                </option>
              ))}
            </select>
          ) : (
            <select
              {...register('apartment_id')}
              className="input"
              id="apt-id-select"
            >
              <option value="">-- Chọn căn hộ --</option>
              {apartments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.apartment_code} - {a.floor?.building?.name}
                </option>
              ))}
            </select>
          )}
        </FormField>

        <FormField label="Tháng ghi nhận (YYYY-MM)" required error={errors.billing_month?.message}>
          <input
            type="month"
            {...register('billing_month')}
            className="input"
            id="billing-month-input"
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Chỉ số điện cũ">
            <input
              type="number"
              value={selectedAptId ? prevElectricityIndex : ''}
              className="input bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200"
              disabled
              id="electricity-prev-input"
            />
          </FormField>

          <FormField label="Chỉ số điện mới" required error={errors.electricity_curr?.message}>
            <input
              type="number"
              step="0.01"
              placeholder="Chỉ số điện mới"
              {...register('electricity_curr')}
              className="input"
              id="electricity-curr-input"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Số người ở (Được lấy từ hợp đồng)" required error={errors.soNguoiO?.message}>
            <input
              type="number"
              placeholder="Số người ở"
              {...register('soNguoiO', { valueAsNumber: true })}
              className="input bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200"
              readOnly
              id="so-nguoi-o-input"
            />
          </FormField>

          <FormField label="Đơn giá điện (Được lấy từ hợp đồng)" required error={errors.electricity_unit_price?.message}>
            <input
              type="number"
              {...register('electricity_unit_price')}
              className="input bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200"
              readOnly
              id="electricity-price-input"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Đơn giá nước (Cố định)">
            <input
              type="text"
              value={`${new Intl.NumberFormat('vi-VN').format(WATER_PRICE_PER_PERSON)} đ/người/tháng`}
              className="input bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200"
              disabled
              id="water-price-static"
            />
          </FormField>
        </div>

        {/* Live Preview section */}
        {selectedAptId && (
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl space-y-1.5 mt-2">
            <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Xem trước chi phí</h4>
            <div className="flex justify-between text-sm text-indigo-950 font-medium">
              <span>Tiền nước ước tính ({soNguoiO} người):</span>
              <span className="font-semibold text-indigo-700">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(soNguoiO * WATER_PRICE_PER_PERSON)}
              </span>
            </div>
            <p className="text-[11px] text-indigo-500/80 mt-1">
              * Tiền nước được tính khoán theo 100.000đ/người/tháng. Chỉ số m³ nước không cần ghi nhận từ tháng này.
            </p>
          </div>
        )}

        <ModalFooter
          onCancel={onClose}
          isLoading={isPending}
          submitLabel="Ghi nhận"
        />
      </form>
    </Modal>
  );
}
