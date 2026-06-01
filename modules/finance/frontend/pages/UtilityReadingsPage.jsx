import { useState, useCallback, useEffect } from 'react';
import { Plus, Search, RotateCcw } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { DataTable } from '@/components/common/DataTable.jsx';
import { RoleGuard } from '@/components/common/RoleGuard.jsx';
import { TENANT_ACCESS_ROLES } from '@/constants/roles.js';
import { useUtilities } from '../hooks/useFinance.js';
import { useApartments } from 'modules/building/frontend/hooks/useBuilding.js';
import { UtilityReadingForm } from '../components/UtilityReadingForm.jsx';
import { useFilterState } from '@/hooks/useFilterState.js';

export default function UtilityReadingsPage() {
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const defaultFilters = {
    apartment_id: '',
    billing_month: '',
  };

  const { filters, hasActiveFilters, setFilter, clearAll } = useFilterState(defaultFilters, null);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters.apartment_id, filters.billing_month]);

  const params = {
    page,
    limit: 20,
    apartment_id: filters.apartment_id ? Number(filters.apartment_id) : undefined,
    billing_month: filters.billing_month || undefined,
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
        <span className="font-mono table-cell-primary">
          {row.apartment?.apartment_code ?? '—'}
        </span>
      ),
    },
    {
      key: 'billing_month',
      label: 'Tháng',
      render: (row) => <span className="table-cell-secondary font-medium">{row.billing_month}</span>,
    },
    {
      key: 'electricity',
      label: 'Chỉ số Điện (kWh)',
      render: (row) => {
        const usage = Number(row.electricity_curr) - Number(row.electricity_prev);
        return (
          <div className="text-sm">
            <span className="table-cell-muted">{Number(row.electricity_prev)}</span>
            <span className="mx-1 table-cell-muted">→</span>
            <span className="table-cell-primary">{Number(row.electricity_curr)}</span>
            <span className="ml-2 badge bg-amber-50 text-amber-700 border border-amber-200">
              +{usage.toFixed(1)}
            </span>
          </div>
        );
      },
    },
    {
      key: 'water_amount',
      label: 'Tiền Nước',
      render: (row) => {
        const n = row.soNguoiO || row.apartment?.contracts?.[0]?.soNguoiO || 1;
        const waterCost = n * 100000;
        return (
          <span className="table-cell-primary font-semibold">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(waterCost)}
          </span>
        );
      },
    },
    {
      key: 'unit_prices',
      label: 'Đơn giá',
      render: (row) => {
        const electPrice = new Intl.NumberFormat('vi-VN').format(Number(row.electricity_unit_price));
        const n = row.soNguoiO || row.apartment?.contracts?.[0]?.soNguoiO || 1;
        return (
          <div className="table-cell-secondary leading-normal">
            <div>Điện: {electPrice} đ/kWh</div>
            <div>Nước: 100.000đ × {n} người</div>
          </div>
        );
      },
    },
    {
      key: 'recorded_by',
      label: 'Người ghi',
      render: (row) => <span className="table-cell-secondary">{row.recorder?.full_name ?? '—'}</span>,
    },
    {
      key: 'recorded_at',
      label: 'Thời gian ghi',
      render: (row) => {
        if (!row.recorded_at) return '—';
        const date = new Date(row.recorded_at);
        const formattedDate = date.toLocaleDateString('vi-VN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
        return <span className="table-cell-muted">{formattedDate}</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chỉ số Điện & Nước"
        subtitle={
          <div className="space-y-1">
            <div>Quản lý và ghi nhận chỉ số tiêu thụ ({total} bản ghi)</div>
            <div className="text-xs text-slate-500 font-normal mt-0.5">
              * Lưu ý: Tiền nước tính theo 100.000đ/người/tháng. Chỉ số nước tiêu thụ m³ không còn được sử dụng để tính tiền từ kỳ này.
            </div>
          </div>
        }
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
      <div className="flex flex-wrap gap-4 items-center bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="w-full sm:w-64">
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
            Lọc theo Căn hộ
          </label>
          <select
            value={filters.apartment_id}
            onChange={(e) => setFilter('apartment_id', e.target.value)}
            className="input w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
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
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
            Lọc theo Tháng
          </label>
          <input
            type="month"
            value={filters.billing_month}
            onChange={(e) => setFilter('billing_month', e.target.value)}
            className="input w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
            id="filter-month-input"
          />
        </div>

        {hasActiveFilters && (
          <button
            onClick={() => {
              clearAll();
              setPage(1);
            }}
            className="btn-ghost text-red-500 hover:text-red-600 hover:bg-red-500/10 transition px-4 py-2 mt-5 text-sm rounded-lg flex items-center gap-1.5"
            id="clear-filters-btn"
          >
            <RotateCcw size={14} />
            Xóa bộ lọc
          </button>
        )}
      </div>

      {total === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed rounded-xl bg-gray-50/50 dark:bg-gray-900/10 border-gray-200 dark:border-gray-800 text-center my-6">
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-400 mb-4 animate-bounce">
            <Search size={32} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Không tìm thấy chỉ số điện nước nào
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
            Không có dữ liệu điện nước nào khớp với các tiêu chí lọc được chọn. Thử xóa hoặc đặt lại bộ lọc.
          </p>
          <button
            onClick={() => {
              clearAll();
              setPage(1);
            }}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 shadow-sm rounded-lg"
          >
            <RotateCcw size={16} />
            Đặt lại bộ lọc
          </button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={readings}
          total={total}
          page={page}
          onPageChange={handlePageChange}
          isLoading={isLoading}
          emptyMessage="Chưa có dữ liệu ghi nhận số điện nước."
        />
      )}

      {isFormOpen && (
        <UtilityReadingForm onClose={() => setIsFormOpen(false)} />
      )}
    </div>
  );
}
