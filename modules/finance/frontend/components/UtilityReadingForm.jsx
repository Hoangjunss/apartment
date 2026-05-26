import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Modal } from '@/components/common/Modal.jsx';
import { FormField } from '@/components/forms/FormField.jsx';
import { ModalFooter } from '@/components/forms/ModalFooter.jsx';
import { useRecordUtility } from '../hooks/useFinance.js';
import { useApartments } from 'modules/building/frontend/hooks/useBuilding.js';

const schema = z.object({
  apartment_id: z.coerce.number().min(1, 'Vui lòng chọn căn hộ'),
  billing_month: z.string().regex(/^\d{4}-\d{2}$/, 'Tháng không hợp lệ (định dạng YYYY-MM)'),
  electricity_curr: z.coerce.number().min(0, 'Chỉ số điện hiện tại không được nhỏ hơn 0'),
  water_curr: z.coerce.number().min(0, 'Chỉ số nước hiện tại không được nhỏ hơn 0'),
  electricity_unit_price: z.coerce.number().min(0, 'Đơn giá điện không được nhỏ hơn 0'),
  water_unit_price: z.coerce.number().min(0, 'Đơn giá nước không được nhỏ hơn 0'),
});

const getCurrentMonthStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export function UtilityReadingForm({ onClose, preselectedApartmentId }) {
  const { data: apartmentsData } = useApartments({ limit: 100 });
  const apartments = apartmentsData?.items ?? [];

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      apartment_id: preselectedApartmentId ?? '',
      billing_month: getCurrentMonthStr(),
      electricity_curr: '',
      water_curr: '',
      electricity_unit_price: 3500,
      water_unit_price: 15000,
    },
  });

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

          <FormField label="Chỉ số nước mới" required error={errors.water_curr?.message}>
            <input
              type="number"
              step="0.01"
              placeholder="Chỉ số nước mới"
              {...register('water_curr')}
              className="input"
              id="water-curr-input"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Đơn giá điện (VND/kWh)" required error={errors.electricity_unit_price?.message}>
            <input
              type="number"
              {...register('electricity_unit_price')}
              className="input"
              id="electricity-price-input"
            />
          </FormField>

          <FormField label="Đơn giá nước (VND/m³)" required error={errors.water_unit_price?.message}>
            <input
              type="number"
              {...register('water_unit_price')}
              className="input"
              id="water-price-input"
            />
          </FormField>
        </div>

        <ModalFooter
          onCancel={onClose}
          isLoading={isPending}
          submitLabel="Ghi nhận"
        />
      </form>
    </Modal>
  );
}
