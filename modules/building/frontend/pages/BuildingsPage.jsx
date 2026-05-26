// modules/building/frontend/pages/BuildingsPage.jsx
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { DataTable } from '@/components/common/DataTable.jsx';
import { SearchBar } from '@/components/forms/SearchBar.jsx';
import { RoleGuard } from '@/components/common/RoleGuard.jsx';
import { ROLES } from '@/constants/roles.js';
import { useBuildings } from '../hooks/useBuilding.js';
import { BuildingForm } from '../components/BuildingForm.jsx';

export default function BuildingsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data, isLoading } = useBuildings({ search, page, limit: 20 });
  const buildings = data?.items ?? [];
  const total = data?.total ?? 0;

  const handlePageChange = useCallback((p) => setPage(p), []);
  const handleSearch = useCallback((v) => { setSearch(v); setPage(1); }, []);

  const columns = [
    { key: 'code', label: 'Mã', width: '100px' },
    { key: 'name', label: 'Tên tòa nhà' },
    { key: 'address', label: 'Địa chỉ' },
    {
      key: 'total_floors',
      label: 'Số tầng',
      width: '90px',
      render: (row) => `${row.total_floors} tầng`,
    },
    {
      key: 'actions',
      label: '',
      width: '100px',
      render: (row) => (
        <button
          onClick={() => navigate(`/buildings/${row.id}`)}
          className="btn-ghost py-1 px-2 text-xs"
          id={`view-building-${row.id}`}
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
        title="Tòa nhà"
        subtitle={`${total} tòa nhà`}
        action={
          <RoleGuard roles={[ROLES.ADMIN]}>
            <button
              onClick={() => setIsFormOpen(true)}
              className="btn-primary"
              id="add-building-btn"
            >
              <Plus size={16} />
              Thêm tòa nhà
            </button>
          </RoleGuard>
        }
      />

      <div className="mb-4">
        <SearchBar
          placeholder="Tìm theo tên, mã tòa nhà..."
          value={search}
          onChange={handleSearch}
        />
      </div>

      <DataTable
        columns={columns}
        data={buildings}
        total={total}
        page={page}
        onPageChange={handlePageChange}
        isLoading={isLoading}
        emptyMessage="Chưa có tòa nhà nào"
      />

      {isFormOpen && (
        <BuildingForm onClose={() => setIsFormOpen(false)} />
      )}
    </div>
  );
}
