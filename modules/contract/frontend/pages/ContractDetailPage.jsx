// modules/contract/frontend/pages/ContractDetailPage.jsx
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Edit2, RefreshCw, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { LoadingSpinner } from '@/components/common/LoadingSpinner.jsx';
import { EmptyState } from '@/components/common/EmptyState.jsx';
import { ContractStatusBadge } from '@/components/common/StatusBadge.jsx';
import { RoleGuard } from '@/components/common/RoleGuard.jsx';
import { MANAGEMENT_ROLES } from '@/constants/roles.js';
import { useContractById, useRenewals } from '../hooks/useContract.js';
import { RenewForm } from '../components/RenewForm.jsx';
import { TerminateForm } from '../components/TerminateForm.jsx';
import { ContractEditForm } from '../components/ContractEditForm.jsx';
import { format, parseISO, differenceInDays } from 'date-fns';

const formatCurrency = (v) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v));

// ── Renewals Tab ───────────────────────────────────────────────────────────────
function RenewalsTab({ contractId }) {
  const { data, isLoading } = useRenewals(contractId);
  const renewals = Array.isArray(data) ? data : [];

  if (isLoading) return <LoadingSpinner />;
  if (renewals.length === 0) return <EmptyState message="Chưa có lịch sử gia hạn" />;

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ngày cũ</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ngày mới</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Giá mới</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Người gia hạn</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Thời gian</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {renewals.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-600">{r.old_end_date ? format(parseISO(r.old_end_date), 'dd/MM/yyyy') : '—'}</td>
              <td className="px-4 py-3 font-medium text-gray-800">{r.new_end_date ? format(parseISO(r.new_end_date), 'dd/MM/yyyy') : '—'}</td>
              <td className="px-4 py-3">{r.new_monthly_rent ? formatCurrency(r.new_monthly_rent) : 'Giữ nguyên'}</td>
              <td className="px-4 py-3 text-gray-600">{r.renewed_by?.full_name ?? '—'}</td>
              <td className="px-4 py-3 text-xs text-gray-400">
                {r.created_at ? format(parseISO(r.created_at), 'dd/MM/yyyy HH:mm') : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ContractDetailPage() {
  const { id } = useParams();
  const contractId = Number(id);
  const [activeTab, setActiveTab] = useState('tenant');
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [isTerminateOpen, setIsTerminateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: contract, isLoading } = useContractById(contractId);

  if (isLoading) return <LoadingSpinner />;
  if (!contract) return <EmptyState message="Không tìm thấy hợp đồng" />;

  const canAct = contract.status === 'ACTIVE' || contract.status === 'EXPIRING_SOON';
  const daysLeft = contract.end_date ? differenceInDays(parseISO(contract.end_date), new Date()) : null;

  const tabs = [
    { key: 'tenant', label: 'Thông tin khách thuê' },
    { key: 'apartment', label: 'Thông tin phòng' },
    { key: 'renewals', label: 'Lịch sử gia hạn' },
  ];

  return (
    <div>
      <PageHeader
        title={`Hợp đồng #${contract.id}`}
        backUrl="/contracts"
        action={
          <RoleGuard roles={MANAGEMENT_ROLES}>
            <div className="flex gap-2">
              <button onClick={() => setIsEditOpen(true)} className="btn-secondary" id="edit-contract-btn">
                <Edit2 size={14} />
                Sửa điều khoản
              </button>
              {canAct && (
                <>
                  <button onClick={() => setIsRenewOpen(true)} className="btn-primary" id="renew-contract-btn">
                    <RefreshCw size={14} />
                    Gia hạn
                  </button>
                  <button onClick={() => setIsTerminateOpen(true)} className="btn-danger" id="terminate-contract-btn">
                    <XCircle size={14} />
                    Chấm dứt
                  </button>
                </>
              )}
            </div>
          </RoleGuard>
        }
      />

      {/* Info Card */}
      <div className="card p-5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <ContractStatusBadge status={contract.status} daysLeft={daysLeft} />
          {contract.status === 'EXPIRING_SOON' && daysLeft <= 7 && (
            <span className="text-xs text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded">
              ⚠ Còn {daysLeft} ngày!
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <p className="info-label">Ngày bắt đầu</p>
            <p className="info-value">{format(parseISO(contract.start_date), 'dd/MM/yyyy')}</p>
          </div>
          <div>
            <p className="info-label">Ngày kết thúc</p>
            <p className="info-value">{format(parseISO(contract.end_date), 'dd/MM/yyyy')}</p>
          </div>
          <div>
            <p className="info-label">Giá thuê/tháng</p>
            <p className="info-value font-semibold text-gray-900">{formatCurrency(contract.monthly_rent)}</p>
          </div>
          <div>
            <p className="info-label">Tiền đặt cọc</p>
            <p className="info-value">{formatCurrency(contract.deposit_amount)}</p>
          </div>
          <div>
            <p className="info-label">Ngày đóng tiền</p>
            <p className="info-value">Ngày {contract.payment_due_day} hằng tháng</p>
          </div>
          {contract.notes && (
            <div className="col-span-2">
              <p className="info-label">Ghi chú</p>
              <p className="info-value text-sm">{contract.notes}</p>
            </div>
          )}
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

      {activeTab === 'tenant' && (
        <div className="card p-5">
          {contract.tenant ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="info-label">Họ tên</p>
                  <Link to={`/tenants/${contract.tenant.id}`} className="text-sm text-blue-600 hover:underline font-medium">
                    {contract.tenant.full_name}
                  </Link>
                </div>
                <div>
                  <p className="info-label">Số CCCD</p>
                  <p className="info-value font-mono">{contract.tenant.national_id}</p>
                </div>
                <div>
                  <p className="info-label">Số điện thoại</p>
                  <p className="info-value">{contract.tenant.phone}</p>
                </div>
                <div>
                  <p className="info-label">Email</p>
                  <p className="info-value">{contract.tenant.email || '—'}</p>
                </div>
              </div>
              <div className="mt-4">
                <Link to={`/tenants/${contract.tenant.id}`} className="btn-secondary">
                  Xem hồ sơ đầy đủ →
                </Link>
              </div>
            </>
          ) : (
            <EmptyState message="Không có thông tin khách thuê" />
          )}
        </div>
      )}

      {activeTab === 'apartment' && (
        <div className="card p-5">
          {contract.apartment ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="info-label">Mã phòng</p>
                  <Link to={`/apartments/${contract.apartment.id}`} className="text-sm text-blue-600 hover:underline font-mono">
                    {contract.apartment.apartment_code}
                  </Link>
                </div>
                <div>
                  <p className="info-label">Tòa nhà / Tầng</p>
                  <p className="info-value">
                    {contract.apartment.floor?.building?.name} / Tầng {contract.apartment.floor?.floor_number}
                  </p>
                </div>
                <div>
                  <p className="info-label">Diện tích</p>
                  <p className="info-value">{contract.apartment.area_sqm} m²</p>
                </div>
              </div>
              <div className="mt-4">
                <Link to={`/apartments/${contract.apartment.id}`} className="btn-secondary">
                  Xem chi tiết phòng →
                </Link>
              </div>
            </>
          ) : (
            <EmptyState message="Không có thông tin căn hộ" />
          )}
        </div>
      )}

      {activeTab === 'renewals' && <RenewalsTab contractId={contractId} />}

      {isRenewOpen && <RenewForm onClose={() => setIsRenewOpen(false)} contract={contract} />}
      {isTerminateOpen && <TerminateForm onClose={() => setIsTerminateOpen(false)} contract={contract} />}
      {isEditOpen && <ContractEditForm onClose={() => setIsEditOpen(false)} contract={contract} />}
    </div>
  );
}
