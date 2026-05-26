// modules/tenant/frontend/pages/TenantsPage.jsx
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { DataTable } from '@/components/common/DataTable.jsx';
import { SearchBar } from '@/components/forms/SearchBar.jsx';
import { ContractStatusBadge } from '@/components/common/StatusBadge.jsx';
import { useTenants } from '../hooks/useTenant.js';

export default function TenantsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');

  const { data, isLoading } = useTenants({ search: search || undefined, status: status || undefined, page, limit: 20 });
  const tenants = data?.items ?? [];
  const total = data?.total ?? 0;

  const handlePageChange = useCallback((p) => setPage(p), []);
  const handleSearch = useCallback((v) => { setSearch(v); setPage(1); }, []);

  const columns = [
    {
      key: 'full_name',
      label: 'Họ tên',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-800">{row.full_name}</p>
          <p className="text-xs text-gray-400">{row.email || ''}</p>
        </div>
      ),
    },
    { key: 'national_id', label: 'Số CCCD', render: (row) => <span className="font-mono text-sm">{row.national_id}</span> },
    { key: 'phone', label: 'SĐT' },
    {
      key: 'current_room',
      label: 'Phòng hiện tại',
      render: (row) => {
        const activeContract = row.contracts?.find(
          (c) => c.status === 'ACTIVE' || c.status === 'EXPIRING_SOON',
        );
        return activeContract?.apartment?.apartment_code ?? '—';
      },
    },
    {
      key: 'contract_status',
      label: 'Trạng thái HĐ',
      render: (row) => {
        const activeContract = row.contracts?.find(
          (c) => c.status === 'ACTIVE' || c.status === 'EXPIRING_SOON',
        );
        return activeContract ? (
          <ContractStatusBadge status={activeContract.status} />
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        );
      },
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
          <button
            onClick={() => navigate('/tenants/new')}
            className="btn-primary"
            id="add-tenant-btn"
          >
            <Plus size={16} />
            Thêm khách thuê
          </button>
        }
      />

      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <SearchBar
            placeholder="Tìm theo tên, CCCD, SĐT..."
            value={search}
            onChange={handleSearch}
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="input w-44"
          id="filter-tenant-status"
        >
          <option value="">Tất cả</option>
          <option value="ACTIVE">Đang thuê</option>
          <option value="INACTIVE">Không hoạt động</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={tenants}
        total={total}
        page={page}
        onPageChange={handlePageChange}
        isLoading={isLoading}
        emptyMessage="Không tìm thấy khách thuê"
      />
    </div>
  );
}
