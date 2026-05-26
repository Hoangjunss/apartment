// modules/tenant/frontend/pages/TenantDetailPage.jsx
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Edit2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { LoadingSpinner } from '@/components/common/LoadingSpinner.jsx';
import { EmptyState } from '@/components/common/EmptyState.jsx';
import { ContractStatusBadge } from '@/components/common/StatusBadge.jsx';
import { RoleGuard } from '@/components/common/RoleGuard.jsx';
import { TENANT_ACCESS_ROLES, MANAGEMENT_ROLES } from '@/constants/roles.js';
import {
  GENDER_LABELS,
  REGISTRATION_TYPE_LABELS,
} from '@/constants/status.js';
import {
  useTenantById,
  useTenantHistory,
  useRegistrationsByTenant,
} from '../hooks/useTenant.js';
import { TenantEditForm } from '../components/TenantEditForm.jsx';
import { RegistrationForm } from '../components/RegistrationForm.jsx';
import { format, parseISO } from 'date-fns';

// ── History Tab ────────────────────────────────────────────────────────────────
function HistoryTab({ tenantId }) {
  const { data, isLoading } = useTenantHistory(tenantId);
  const history = Array.isArray(data) ? data : [];

  if (isLoading) return <LoadingSpinner />;
  if (history.length === 0) return <EmptyState message="Chưa có lịch sử thuê phòng" />;

  return (
    <div className="space-y-3">
      {history.map((contract, i) => (
        <div key={contract.id ?? i} className="card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">
                {contract.apartment?.apartment_code ?? '—'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {contract.start_date ? format(parseISO(contract.start_date), 'dd/MM/yyyy') : '?'}
                {' → '}
                {contract.end_date ? format(parseISO(contract.end_date), 'dd/MM/yyyy') : '?'}
              </p>
            </div>
            <ContractStatusBadge status={contract.status} />
          </div>
          <div className="mt-2">
            <Link
              to={`/contracts/${contract.id}`}
              className="text-xs text-blue-600 hover:underline"
            >
              Xem hợp đồng →
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Registrations Tab ──────────────────────────────────────────────────────────
function RegistrationsTab({ tenantId }) {
  const { data, isLoading } = useRegistrationsByTenant(tenantId);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const registrations = Array.isArray(data) ? data : [];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{registrations.length} khai báo</p>
        <RoleGuard roles={TENANT_ACCESS_ROLES}>
          <button
            onClick={() => setIsFormOpen(true)}
            className="btn-primary"
            id="add-registration-btn"
          >
            <Plus size={14} />
            Tạo khai báo
          </button>
        </RoleGuard>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : registrations.length === 0 ? (
        <EmptyState message="Chưa có khai báo nào" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Loại</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Từ ngày</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Đến ngày</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Lý do</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {registrations.map((reg) => (
                <tr key={reg.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`badge ${reg.type === 'TEMPORARY_RESIDENCE' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                      {REGISTRATION_TYPE_LABELS[reg.type] ?? reg.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{format(parseISO(reg.start_date), 'dd/MM/yyyy')}</td>
                  <td className="px-4 py-3 text-gray-600">{format(parseISO(reg.end_date), 'dd/MM/yyyy')}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{reg.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isFormOpen && (
        <RegistrationForm onClose={() => setIsFormOpen(false)} tenantId={tenantId} />
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function TenantDetailPage() {
  const { id } = useParams();
  const tenantId = Number(id);
  const [activeTab, setActiveTab] = useState('history');
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: tenant, isLoading } = useTenantById(tenantId);

  if (isLoading) return <LoadingSpinner />;
  if (!tenant) return <EmptyState message="Không tìm thấy khách thuê" />;

  const activeContract = tenant.contracts?.find(
    (c) => c.status === 'ACTIVE' || c.status === 'EXPIRING_SOON',
  );

  const tabs = [
    { key: 'history', label: 'Lịch sử thuê phòng' },
    { key: 'registrations', label: 'Khai báo tạm trú/vắng' },
    { key: 'contract', label: 'Hợp đồng hiện tại' },
  ];

  return (
    <div>
      <PageHeader
        title={tenant.full_name}
        subtitle={`CCCD: ${tenant.national_id}`}
        backUrl="/tenants"
        action={
          <RoleGuard roles={TENANT_ACCESS_ROLES}>
            <button onClick={() => setIsEditOpen(true)} className="btn-secondary" id="edit-tenant-btn">
              <Edit2 size={14} />
              Sửa hồ sơ
            </button>
          </RoleGuard>
        }
      />

      {/* Info Card */}
      <div className="card p-5 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <p className="info-label">Ngày sinh</p>
            <p className="info-value">{tenant.date_of_birth ? format(parseISO(tenant.date_of_birth), 'dd/MM/yyyy') : '—'}</p>
          </div>
          <div>
            <p className="info-label">Giới tính</p>
            <p className="info-value">{GENDER_LABELS[tenant.gender] ?? tenant.gender}</p>
          </div>
          <div>
            <p className="info-label">Số điện thoại</p>
            <p className="info-value">{tenant.phone}</p>
          </div>
          <div>
            <p className="info-label">Email</p>
            <p className="info-value">{tenant.email || '—'}</p>
          </div>
          <div>
            <p className="info-label">Quốc tịch</p>
            <p className="info-value">{tenant.nationality || 'Việt Nam'}</p>
          </div>
          <div>
            <p className="info-label">Nghề nghiệp</p>
            <p className="info-value">{tenant.occupation || '—'}</p>
          </div>
          <div className="col-span-2">
            <p className="info-label">Địa chỉ thường trú</p>
            <p className="info-value">{tenant.permanent_address}</p>
          </div>
          <div>
            <p className="info-label">Nơi cấp CCCD</p>
            <p className="info-value text-xs">{tenant.national_id_issued_place}</p>
          </div>
          <div>
            <p className="info-label">Ngày cấp CCCD</p>
            <p className="info-value">{tenant.national_id_issued_date ? format(parseISO(tenant.national_id_issued_date), 'dd/MM/yyyy') : '—'}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-5">
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`tab-btn ${activeTab === tab.key ? 'tab-btn-active' : 'tab-btn-inactive'}`}
              id={`tab-${tab.key}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'history' && <HistoryTab tenantId={tenantId} />}
      {activeTab === 'registrations' && <RegistrationsTab tenantId={tenantId} />}
      {activeTab === 'contract' && (
        <div>
          {activeContract ? (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <ContractStatusBadge status={activeContract.status} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="info-label">Phòng</p>
                  <Link to={`/apartments/${activeContract.apartment?.id}`} className="text-sm text-blue-600 hover:underline">
                    {activeContract.apartment?.apartment_code}
                  </Link>
                </div>
                <div>
                  <p className="info-label">Giá thuê/tháng</p>
                  <p className="info-value">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(activeContract.monthly_rent))}
                  </p>
                </div>
                <div>
                  <p className="info-label">Bắt đầu</p>
                  <p className="info-value">{format(parseISO(activeContract.start_date), 'dd/MM/yyyy')}</p>
                </div>
                <div>
                  <p className="info-label">Kết thúc</p>
                  <p className="info-value">{format(parseISO(activeContract.end_date), 'dd/MM/yyyy')}</p>
                </div>
              </div>
              <div className="mt-4">
                <Link to={`/contracts/${activeContract.id}`} className="btn-secondary">
                  Xem hợp đồng đầy đủ →
                </Link>
              </div>
            </div>
          ) : (
            <EmptyState message="Không có hợp đồng đang hiệu lực" />
          )}
        </div>
      )}

      {isEditOpen && (
        <TenantEditForm onClose={() => setIsEditOpen(false)} tenant={tenant} />
      )}
    </div>
  );
}
