// modules/contract/frontend/pages/ContractsPage.jsx
import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Eye, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { DataTable } from '@/components/common/DataTable.jsx';
import { SearchBar } from '@/components/forms/SearchBar.jsx';
import { ContractStatusBadge } from '@/components/common/StatusBadge.jsx';
import { RoleGuard } from '@/components/common/RoleGuard.jsx';
import { MANAGEMENT_ROLES } from '@/constants/roles.js';
import { CONTRACT_STATUS_CONFIG } from '@/constants/status.js';
import { useContracts, useExpiringSoon } from '../hooks/useContract.js';
import { format, parseISO, differenceInDays } from 'date-fns';

const formatCurrency = (v) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v));

export default function ContractsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(searchParams.get('status') ?? '');

  const { data, isLoading } = useContracts({
    search: search || undefined,
    status: status || undefined,
    page,
    limit: 20,
  });
  const { data: expiring } = useExpiringSoon();

  const contracts = data?.items ?? [];
  const total = data?.total ?? 0;
  const expiringSoonList = Array.isArray(expiring) ? expiring : (expiring?.items ?? []);

  const handlePageChange = useCallback((p) => setPage(p), []);
  const handleSearch = useCallback((v) => { setSearch(v); setPage(1); }, []);

  const columns = [
    {
      key: 'id',
      label: 'Mã HĐ',
      render: (row) => <span className="font-mono text-sm text-gray-500">#{row.id}</span>,
    },
    {
      key: 'tenant',
      label: 'Khách thuê',
      render: (row) => (
        <p className="font-medium text-gray-800 text-sm">{row.tenant?.full_name ?? '—'}</p>
      ),
    },
    {
      key: 'apartment',
      label: 'Phòng',
      render: (row) => (
        <span className="font-mono text-sm">{row.apartment?.apartment_code ?? '—'}</span>
      ),
    },
    {
      key: 'start_date',
      label: 'Bắt đầu',
      render: (row) => row.start_date ? format(parseISO(row.start_date), 'dd/MM/yyyy') : '—',
    },
    {
      key: 'end_date',
      label: 'Kết thúc',
      render: (row) => row.end_date ? format(parseISO(row.end_date), 'dd/MM/yyyy') : '—',
    },
    {
      key: 'monthly_rent',
      label: 'Giá thuê',
      render: (row) => <span className="text-sm">{formatCurrency(row.monthly_rent)}</span>,
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
        }
      />

      {/* Banner cảnh báo */}
      {expiringSoonList.length > 0 && (
        <div
          className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl mb-4 cursor-pointer hover:bg-orange-100 transition"
          onClick={() => setStatus('EXPIRING_SOON')}
          id="expiring-banner"
        >
          <AlertTriangle size={18} className="text-orange-500 shrink-0" />
          <p className="text-sm text-orange-700">
            <strong>{expiringSoonList.length} hợp đồng</strong> sắp hết hạn trong 30 ngày tới.{' '}
            <span className="underline">Xem danh sách →</span>
          </p>
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <SearchBar
            placeholder="Tìm theo khách thuê, mã phòng..."
            value={search}
            onChange={handleSearch}
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="input w-48"
          id="filter-contract-status"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(CONTRACT_STATUS_CONFIG).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={contracts}
        total={total}
        page={page}
        onPageChange={handlePageChange}
        isLoading={isLoading}
        emptyMessage="Không tìm thấy hợp đồng nào"
      />
    </div>
  );
}
