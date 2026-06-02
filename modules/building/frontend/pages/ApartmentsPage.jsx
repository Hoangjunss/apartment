// modules/building/frontend/pages/ApartmentsPage.jsx
import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Search, RotateCcw } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { DataTable } from '@/components/common/DataTable.jsx';
import { SearchBar } from '@/components/forms/SearchBar.jsx';
import { ApartmentStatusBadge } from '@/components/common/StatusBadge.jsx';
import { RoleGuard } from '@/components/common/RoleGuard.jsx';
import { MANAGEMENT_ROLES } from '@/constants/roles.js';
import { ROOM_TYPE_LABELS, APARTMENT_STATUS_CONFIG } from '@/constants/status.js';
import { useApartments, useBuildings, useDistinctRoomTypes } from '../hooks/useBuilding.js';
import { ApartmentForm } from '../components/ApartmentForm.jsx';
import { useFilterState } from '@/hooks/useFilterState.js';

const formatCurrency = (v) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v));

export default function ApartmentsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const searchInputRef = useRef(null);
  const defaultFilters = {
    search: '',
    status: '',
    building_id: '',
    room_type: '',
  };

  const { filters, hasActiveFilters, setFilter, clearAll } = useFilterState(defaultFilters, searchInputRef);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.status, filters.building_id, filters.room_type]);

  const params = {
    search: filters.search || undefined,
    status: filters.status || undefined,
    building_id: filters.building_id || undefined,
    room_type: filters.room_type || undefined,
    page,
    limit: 20,
  };

  const { data, isLoading } = useApartments(params);
  const { data: buildingsData } = useBuildings({ limit: 100 });
  const { data: distinctRoomTypes } = useDistinctRoomTypes();

  const apartments = data?.items ?? [];
  const total = data?.total ?? 0;
  const buildings = buildingsData?.items ?? [];

  const handlePageChange = useCallback((p) => setPage(p), []);
  const handleSearch = useCallback((v) => setFilter('search', v), [setFilter]);

  const columns = [
    {
      key: 'apartment_code',
      label: 'Mã phòng',
      render: (row) => <span className="font-mono table-cell-primary">{row.apartment_code}</span>,
    },
    {
      key: 'room_type',
      label: 'Loại',
      render: (row) => <span className="table-cell-secondary">{ROOM_TYPE_LABELS[row.room_type] ?? row.room_type}</span>,
    },
    {
      key: 'area_sqm',
      label: 'Diện tích',
      render: (row) => <span className="table-cell-secondary">{row.area_sqm} m²</span>,
    },
    {
      key: 'base_price',
      label: 'Giá cơ bản',
      render: (row) => <span className="table-cell-secondary">{formatCurrency(row.base_price)}</span>,
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (row) => <ApartmentStatusBadge status={row.status} />,
    },
    {
      key: 'location',
      label: 'Tầng / Tòa',
      render: (row) => (
        <span className="table-cell-muted">
          {row.floor
            ? `Tầng ${row.floor.floor_number} / ${row.floor.building?.name ?? '—'}`
            : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <button
          onClick={() => navigate(`/apartments/${row.id}`)}
          className="btn-ghost py-1 px-2 text-xs"
          id={`view-apt-${row.id}`}
        >
          <Eye size={14} />
          Chi tiết
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Căn hộ"
        subtitle={`${total} căn hộ`}
        action={
          <RoleGuard roles={MANAGEMENT_ROLES}>
            <button
              onClick={() => setIsFormOpen(true)}
              className="btn-primary"
              id="add-apartment-btn"
            >
              <Plus size={16} />
              Thêm căn hộ
            </button>
          </RoleGuard>
        }
      />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex-1 min-w-48">
          <SearchBar
            ref={searchInputRef}
            placeholder="Tìm theo mã phòng..."
            value={filters.search}
            onChange={handleSearch}
          />
        </div>

        <select
          value={filters.status}
          onChange={(e) => setFilter('status', e.target.value)}
          className="input w-44"
          id="filter-status"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(APARTMENT_STATUS_CONFIG).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>

        <select
          value={filters.building_id}
          onChange={(e) => setFilter('building_id', e.target.value)}
          className="input w-44"
          id="filter-building"
        >
          <option value="">Tất cả tòa nhà</option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        <select
          value={filters.room_type}
          onChange={(e) => setFilter('room_type', e.target.value)}
          className="input w-44"
          id="filter-room-type"
        >
          <option value="">Tất cả loại</option>
          {(distinctRoomTypes ?? []).map((v) => (
            <option key={v} value={v}>{ROOM_TYPE_LABELS[v] ?? v}</option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={() => {
              clearAll();
              setPage(1);
            }}
            className="btn-ghost text-red-500 hover:text-red-600 hover:bg-red-500/10 transition px-3 py-2 text-sm rounded-lg flex items-center gap-1.5"
            id="clear-filters-btn"
          >
            <RotateCcw size={14} />
            Xóa bộ lọc
          </button>
        )}

        {/* Dynamic Highlight Badge for Available apartments */}
        {filters.status === 'AVAILABLE' && filters.building_id && (
          <div className="flex items-center text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20 animate-pulse">
            ⚡ {buildings.find(b => String(b.id) === String(filters.building_id))?.name || 'Tòa nhà'}: {total} căn trống
          </div>
        )}
      </div>

      {total === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed rounded-xl bg-gray-50/50 dark:bg-gray-900/10 border-gray-200 dark:border-gray-800 text-center my-6">
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-400 mb-4 animate-bounce">
            <Search size={32} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Không tìm thấy căn hộ nào
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
            Không có kết quả nào khớp với các tiêu chí tìm kiếm hoặc bộ lọc hiện tại. Thử xóa hoặc thay đổi bộ lọc của bạn.
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
          data={apartments}
          total={total}
          page={page}
          onPageChange={handlePageChange}
          isLoading={isLoading}
          emptyMessage="Không tìm thấy căn hộ nào"
        />
      )}

      {isFormOpen && (
        <ApartmentForm onClose={() => setIsFormOpen(false)} />
      )}
    </div>
  );
}
