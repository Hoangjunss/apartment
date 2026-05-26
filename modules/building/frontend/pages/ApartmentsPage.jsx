// modules/building/frontend/pages/ApartmentsPage.jsx
import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Eye } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { DataTable } from '@/components/common/DataTable.jsx';
import { SearchBar } from '@/components/forms/SearchBar.jsx';
import { ApartmentStatusBadge } from '@/components/common/StatusBadge.jsx';
import { RoleGuard } from '@/components/common/RoleGuard.jsx';
import { MANAGEMENT_ROLES } from '@/constants/roles.js';
import { ROOM_TYPE_LABELS, APARTMENT_STATUS_CONFIG } from '@/constants/status.js';
import { useApartments, useBuildings } from '../hooks/useBuilding.js';
import { ApartmentForm } from '../components/ApartmentForm.jsx';

const formatCurrency = (v) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v));

export default function ApartmentsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [buildingId, setBuildingId] = useState(searchParams.get('building_id') ?? '');
  const [roomType, setRoomType] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const params = {
    search: search || undefined,
    status: status || undefined,
    building_id: buildingId || undefined,
    room_type: roomType || undefined,
    page,
    limit: 20,
  };

  const { data, isLoading } = useApartments(params);
  const { data: buildingsData } = useBuildings({ limit: 100 });

  const apartments = data?.items ?? [];
  const total = data?.total ?? 0;
  const buildings = buildingsData?.items ?? [];

  const handlePageChange = useCallback((p) => setPage(p), []);
  const handleSearch = useCallback((v) => { setSearch(v); setPage(1); }, []);

  const columns = [
    {
      key: 'apartment_code',
      label: 'Mã phòng',
      render: (row) => <span className="font-mono font-medium">{row.apartment_code}</span>,
    },
    {
      key: 'room_type',
      label: 'Loại',
      render: (row) => ROOM_TYPE_LABELS[row.room_type] ?? row.room_type,
    },
    {
      key: 'area_sqm',
      label: 'Diện tích',
      render: (row) => `${row.area_sqm} m²`,
    },
    {
      key: 'base_price',
      label: 'Giá cơ bản',
      render: (row) => formatCurrency(row.base_price),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (row) => <ApartmentStatusBadge status={row.status} />,
    },
    {
      key: 'location',
      label: 'Tầng / Tòa',
      render: (row) =>
        row.floor
          ? `Tầng ${row.floor.floor_number} / ${row.floor.building?.name ?? '—'}`
          : '—',
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
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-48">
          <SearchBar
            placeholder="Tìm theo mã phòng..."
            value={search}
            onChange={handleSearch}
          />
        </div>

        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="input w-44"
          id="filter-status"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(APARTMENT_STATUS_CONFIG).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>

        <select
          value={buildingId}
          onChange={(e) => { setBuildingId(e.target.value); setPage(1); }}
          className="input w-44"
          id="filter-building"
        >
          <option value="">Tất cả tòa nhà</option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        <select
          value={roomType}
          onChange={(e) => { setRoomType(e.target.value); setPage(1); }}
          className="input w-44"
          id="filter-room-type"
        >
          <option value="">Tất cả loại</option>
          {Object.entries(ROOM_TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={apartments}
        total={total}
        page={page}
        onPageChange={handlePageChange}
        isLoading={isLoading}
        emptyMessage="Không tìm thấy căn hộ nào"
      />

      {isFormOpen && (
        <ApartmentForm onClose={() => setIsFormOpen(false)} />
      )}
    </div>
  );
}
