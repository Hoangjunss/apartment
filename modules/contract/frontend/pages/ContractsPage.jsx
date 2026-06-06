// modules/contract/frontend/pages/ContractsPage.jsx
import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, AlertTriangle, Search, RotateCcw, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/axios.js';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { DataTable } from '@/components/common/DataTable.jsx';
import { SearchBar } from '@/components/forms/SearchBar.jsx';
import { ContractStatusBadge } from '@/components/common/StatusBadge.jsx';
import { RoleGuard } from '@/components/common/RoleGuard.jsx';
import { MANAGEMENT_ROLES } from '@/constants/roles.js';
import { CONTRACT_STATUS_CONFIG } from '@/constants/status.js';
import { useContracts, useExpiringSoon } from '../hooks/useContract.js';
import { useBuildings } from 'modules/building/frontend/hooks/useBuilding.js';
import { useFilterState } from '@/hooks/useFilterState.js';
import { format, parseISO, differenceInDays } from 'date-fns';
import { useActiveBuilding } from '@/contexts/BuildingContext.jsx';

const formatCurrency = (v) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v));

export default function ContractsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { selectedBuildingId, setSelectedBuildingId } = useActiveBuilding();

  const searchInputRef = useRef(null);
  const defaultFilters = {
    search: '',
    status: '',
    month: '',
  };

  const { filters, hasActiveFilters, setFilter, clearAll } = useFilterState(defaultFilters, searchInputRef);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.status, filters.month, selectedBuildingId]);

  const { data, isLoading } = useContracts({
    search: filters.search || undefined,
    status: filters.status || undefined,
    building_id: selectedBuildingId !== 'all' ? selectedBuildingId : undefined,
    month: filters.month || undefined,
    page,
    limit: 20,
  });

  const { data: expiring } = useExpiringSoon();
  const { data: buildingsData } = useBuildings({ limit: 100 });

  const contracts = data?.items ?? [];
  const total = data?.total ?? 0;
  const expiringSoonList = Array.isArray(expiring) ? expiring : (expiring?.items ?? []);
  const buildings = buildingsData?.items ?? [];

  const handlePageChange = useCallback((p) => setPage(p), []);
  const handleSearch = useCallback((v) => setFilter('search', v), [setFilter]);

  const handleExport = async (format) => {
    try {
      toast.loading('Đang chuẩn bị file tải xuống...', { id: 'export-toast' });
      const res = await api.get('/report/export/contracts', {
        params: {
          search: filters.search || undefined,
          status: filters.status || undefined,
          format
        },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `danh_sach_hop_dong.${format === 'csv' ? 'csv' : 'xlsx'}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('Đã tải xuống file thành công!', { id: 'export-toast' });
    } catch (err) {
      console.error(err);
      toast.error('Có lỗi xảy ra khi xuất dữ liệu', { id: 'export-toast' });
    }
  };

  const columns = [
    {
      key: 'contract_code',
      label: 'Mã HĐ',
      render: (row) => <span className="font-mono table-cell-primary">{row.contract_code || `#${row.id}`}</span>,
    },
    {
      key: 'tenant',
      label: 'Khách thuê',
      render: (row) => (
        <p className="table-cell-primary">{row.tenant?.full_name ?? '—'}</p>
      ),
    },
    {
      key: 'apartment',
      label: 'Phòng',
      render: (row) => (
        <span className="font-mono table-cell-secondary">{row.apartment?.apartment_code ?? '—'}</span>
      ),
    },
    {
      key: 'start_date',
      label: 'Bắt đầu',
      render: (row) => row.start_date ? <span className="table-cell-muted">{format(parseISO(row.start_date), 'dd/MM/yyyy')}</span> : '—',
    },
    {
      key: 'end_date',
      label: 'Kết thúc',
      render: (row) => row.end_date ? <span className="table-cell-muted">{format(parseISO(row.end_date), 'dd/MM/yyyy')}</span> : '—',
    },
    {
      key: 'monthly_rent',
      label: 'Giá thuê',
      render: (row) => <span className="table-cell-secondary font-medium">{formatCurrency(row.monthly_rent)}</span>,
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (row) => {
        const daysLeft = row.status === 'EXPIRING_SOON' && row.end_date
          ? differenceInDays(parseISO(row.end_date), new Date())
          : null;
        return <ContractStatusBadge status={row.status} daysLeft={daysLeft} />;
      },
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <button
          onClick={() => navigate(`/contracts/${row.id}`)}
          className="btn-ghost py-1 px-2 text-xs"
          id={`view-contract-${row.id}`}
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
        title="Hợp đồng"
        subtitle={`${total} hợp đồng`}
        action={
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('excel')}
              className="btn-secondary flex items-center gap-1.5"
            >
              <Download size={14} /> Excel
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="btn-secondary flex items-center gap-1.5"
            >
              <Download size={14} /> CSV
            </button>
            <RoleGuard roles={MANAGEMENT_ROLES}>
              <button
                onClick={() => navigate('/contracts/new')}
                className="btn-primary"
                id="add-contract-btn"
              >
                <Plus size={16} />
                Tạo hợp đồng
              </button>
            </RoleGuard>
          </div>
        }
      />

      {/* Banner cảnh báo */}
      {expiringSoonList.length > 0 && (
        <div
          className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 dark:bg-orange-950/20 dark:border-orange-900/30 rounded-xl mb-4 cursor-pointer hover:bg-orange-100/50 transition animate-pulse"
          onClick={() => setFilter('status', 'EXPIRING_SOON')}
          id="expiring-banner"
        >
          <AlertTriangle size={18} className="text-orange-500 shrink-0" />
          <p className="text-sm text-orange-700 dark:text-orange-300">
            <strong>{expiringSoonList.length} hợp đồng</strong> sắp hết hạn trong 30 ngày tới.{' '}
            <span className="underline font-semibold">Xem danh sách →</span>
          </p>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex-1 min-w-48">
          <SearchBar
            ref={searchInputRef}
            placeholder="Tìm theo khách thuê, mã phòng..."
            value={filters.search}
            onChange={handleSearch}
          />
        </div>

        <select
          value={filters.status}
          onChange={(e) => setFilter('status', e.target.value)}
          className="input w-48"
          id="filter-contract-status"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(CONTRACT_STATUS_CONFIG).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>

        <select
          value={selectedBuildingId}
          onChange={(e) => {
            setSelectedBuildingId(e.target.value || 'all');
          }}
          className="input w-44"
          id="filter-building"
        >
          <option value="all">Tất cả tòa nhà</option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        <input
          type="month"
          value={filters.month}
          onChange={(e) => setFilter('month', e.target.value)}
          className="input w-44"
          id="filter-month"
        />

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
      </div>

      {total === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed rounded-xl bg-gray-50/50 dark:bg-gray-900/10 border-gray-200 dark:border-gray-800 text-center my-6">
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-400 mb-4 animate-bounce">
            <Search size={32} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Không tìm thấy hợp đồng nào
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
            Không có hợp đồng nào khớp với các tiêu chí tìm kiếm hoặc bộ lọc hiện tại. Thử xóa hoặc đặt lại bộ lọc của bạn.
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
          data={contracts}
          total={total}
          page={page}
          onPageChange={handlePageChange}
          isLoading={isLoading}
          emptyMessage="Không tìm thấy hợp đồng nào"
        />
      )}
    </div>
  );
}
