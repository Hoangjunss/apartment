// modules/tenant/frontend/pages/TenantsPage.jsx
import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Search, RotateCcw, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/axios.js';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { DataTable } from '@/components/common/DataTable.jsx';
import { SearchBar } from '@/components/forms/SearchBar.jsx';
import { ContractStatusBadge } from '@/components/common/StatusBadge.jsx';
import { useTenants } from '../hooks/useTenant.js';
import { useFilterState } from '@/hooks/useFilterState.js';

export default function TenantsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const searchInputRef = useRef(null);
  const defaultFilters = {
    search: '',
    status: '',
  };

  const { filters, hasActiveFilters, setFilter, clearAll } = useFilterState(defaultFilters, searchInputRef);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.status]);

  const { data, isLoading } = useTenants({
    search: filters.search || undefined,
    status: filters.status || undefined,
    page,
    limit: 20
  });

  const tenants = data?.items ?? [];
  const total = data?.total ?? 0;

  const handlePageChange = useCallback((p) => setPage(p), []);
  const handleSearch = useCallback((v) => setFilter('search', v), [setFilter]);

  const handleExport = async (format) => {
    try {
      toast.loading('Đang chuẩn bị file tải xuống...', { id: 'export-toast' });
      const res = await api.get('/report/export/tenants', {
        params: {
          search: filters.search || undefined,
          format
        },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `danh_sach_khach_thue.${format === 'csv' ? 'csv' : 'xlsx'}`);
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
      key: 'full_name',
      label: 'Họ tên',
      render: (row) => (
        <div>
          <p className="table-cell-primary">{row.full_name}</p>
          <p className="table-cell-muted">{row.email || ''}</p>
        </div>
      ),
    },
    { key: 'national_id', label: 'Số CCCD', render: (row) => <span className="font-mono table-cell-secondary">{row.national_id}</span> },
    { key: 'phone', label: 'SĐT', render: (row) => <span className="table-cell-secondary">{row.phone}</span> },
    {
      key: 'current_room',
      label: 'Phòng hiện tại',
      render: (row) => (
        <span className="font-mono table-cell-primary">
          {row.current_room ?? '—'}
        </span>
      ),
    },
    {
      key: 'contract_status',
      label: 'Trạng thái HĐ',
      render: (row) => row.contract_status ? (
        <ContractStatusBadge status={row.contract_status} />
      ) : (
        <span className="table-cell-muted">—</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <button
          onClick={() => navigate(`/tenants/${row.id}`)}
          className="btn-ghost py-1 px-2 text-xs"
          id={`view-tenant-${row.id}`}
        >
          <Eye size={14} />
          Hồ sơ
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Khách thuê"
        subtitle={`${total} khách thuê`}
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
            <button
              onClick={() => navigate('/tenants/new')}
              className="btn-primary"
              id="add-tenant-btn"
            >
              <Plus size={16} />
              Thêm khách thuê
            </button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex-1 min-w-48">
          <SearchBar
            ref={searchInputRef}
            placeholder="Tìm theo tên, CCCD, SĐT..."
            value={filters.search}
            onChange={handleSearch}
          />
        </div>
        <select
          value={filters.status}
          onChange={(e) => setFilter('status', e.target.value)}
          className="input w-44"
          id="filter-tenant-status"
        >
          <option value="">Tất cả</option>
          <option value="ACTIVE">Đang thuê</option>
          <option value="INACTIVE">Không hoạt động</option>
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
      </div>

      {total === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed rounded-xl bg-gray-50/50 dark:bg-gray-900/10 border-gray-200 dark:border-gray-800 text-center my-6">
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-400 mb-4 animate-bounce">
            <Search size={32} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Không tìm thấy khách thuê nào
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
            Không có khách thuê nào phù hợp với các tiêu chí tìm kiếm hoặc bộ lọc được chọn. Thử xóa hoặc đặt lại bộ lọc.
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
          data={tenants}
          total={total}
          page={page}
          onPageChange={handlePageChange}
          isLoading={isLoading}
          emptyMessage="Không tìm thấy khách thuê"
        />
      )}
    </div>
  );
}
