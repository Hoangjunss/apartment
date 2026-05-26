import { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { DataTable } from '@/components/common/DataTable.jsx';
import { RoleGuard } from '@/components/common/RoleGuard.jsx';
import { TENANT_ACCESS_ROLES } from '@/constants/roles.js';
import { useUtilities } from '../hooks/useFinance.js';
import { useApartments } from 'modules/building/frontend/hooks/useBuilding.js';
import { UtilityReadingForm } from '../components/UtilityReadingForm.jsx';

export default function UtilityReadingsPage() {
  const [page, setPage] = useState(1);
  const [apartmentId, setApartmentId] = useState('');
  const [billingMonth, setBillingMonth] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const params = {
    page,
    limit: 20,
    apartment_id: apartmentId ? Number(apartmentId) : undefined,
    billing_month: billingMonth || undefined,
  };

  const { data, isLoading } = useUtilities(params);
  const { data: apartmentsData } = useApartments({ limit: 100 });

  const readings = data?.items ?? [];
  const total = data?.total ?? 0;
  const apartments = apartmentsData?.items ?? [];

  const handlePageChange = useCallback((p) => setPage(p), []);

  const columns = [
    {
      key: 'apartment_code',
      label: 'Căn hộ',
      render: (row) => (
        <span className="font-mono font-semibold text-slate-800">
          {row.apartment?.apartment_code ?? '—'}
        </span>
      ),
    },
    {
      key: 'billing_month',
      label: 'Tháng',
      render: (row) => <span className="font-medium text-slate-700">{row.billing_month}</span>,
    },
    {
      key: 'electricity',
      label: 'Chỉ số Điện (kWh)',
      render: (row) => {
        const usage = Number(row.electricity_curr) - Number(row.electricity_prev);
        return (
          <div className="text-sm">
            <span className="text-gray-400">{Number(row.electricity_prev)}</span>
            <span className="mx-1 text-gray-400">→</span>
            <span className="font-medium text-slate-700">{Number(row.electricity_curr)}</span>
            <span className="ml-2 badge bg-amber-50 text-amber-700 border border-amber-200">
              +{usage.toFixed(1)}
            </span>
          </div>
        );
      },
    },
    {
      key: 'water',
      label: 'Chỉ số Nước (m³)',
      render: (row) => {
        const usage = Number(row.water_curr) - Number(row.water_prev);
        return (
          <div className="text-sm">
            <span className="text-gray-400">{Number(row.water_prev)}</span>
            <span className="mx-1 text-gray-400">→</span>
            <span className="font-medium text-slate-700">{Number(row.water_curr)}</span>
            <span className="ml-2 badge bg-sky-50 text-sky-700 border border-sky-200">
              +{usage.toFixed(1)}
            </span>
          </div>
        );
      },
    },
    {
      key: 'unit_prices',
      label: 'Đơn giá',
      render: (row) => {
        const electPrice = new Intl.NumberFormat('vi-VN').format(Number(row.electricity_unit_price));
        const waterPrice = new Intl.NumberFormat('vi-VN').format(Number(row.water_unit_price));
        return (
          <div className="text-xs text-gray-500 leading-normal">
            <div>Điện: {electPrice} đ</div>
            <div>Nước: {waterPrice} đ</div>
          </div>
        );
      },
    },
    {
      key: 'recorded_by',
      label: 'Người ghi',
      render: (row) => row.recorder?.full_name ?? '—',
    },
    {
      key: 'recorded_at',
      label: 'Thời gian ghi',
      render: (row) => {
        if (!row.recorded_at) return '—';
        const date = new Date(row.recorded_at);
        return date.toLocaleDateString('vi-VN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chỉ số Điện & Nước"
        subtitle={`Quản lý và ghi nhận chỉ số tiêu thụ (${total} bản ghi)`}
        action={
          <RoleGuard roles={TENANT_ACCESS_ROLES}>
            <button
              onClick={() => setIsFormOpen(true)}
              className="btn-primary flex items-center gap-2"
              id="record-utility-btn"
            >
              <Plus size={16} />
              Ghi chỉ số mới
            </button>
          </RoleGuard>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="w-full sm:w-64">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Lọc theo Căn hộ
          </label>
          <select
            value={apartmentId}
            onChange={(e) => {
              setApartmentId(e.target.value);
              setPage(1);
            }}
            className="input w-full"
            id="filter-apt-select"
          >
            <option value="">Tất cả căn hộ</option>
            {apartments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.apartment_code} - {a.floor?.building?.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-48">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Lọc theo Tháng
          </label>
          <input
            type="month"
            value={billingMonth}
            onChange={(e) => {
              setBillingMonth(e.target.value);
              setPage(1);
            }}
            className="input w-full"
            id="filter-month-input"
          />
        </div>

        {(apartmentId || billingMonth) && (
          <button
            onClick={() => {
              setApartmentId('');
              setBillingMonth('');
              setPage(1);
            }}
            className="mt-6 text-sm text-slate-500 hover:text-slate-800 transition"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={readings}
        total={total}
        page={page}
        onPageChange={handlePageChange}
        isLoading={isLoading}
        emptyMessage="Chưa có dữ liệu ghi nhận số điện nước."
      />

      {isFormOpen && (
        <UtilityReadingForm onClose={() => setIsFormOpen(false)} />
      )}
    </div>
  );
}
