// modules/building/frontend/pages/ApartmentDetailPage.jsx
import { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Edit2, RefreshCw, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { LoadingSpinner } from '@/components/common/LoadingSpinner.jsx';
import { EmptyState } from '@/components/common/EmptyState.jsx';
import { ApartmentStatusBadge } from '@/components/common/StatusBadge.jsx';
import { ConfirmDialog } from '@/components/common/ConfirmDialog.jsx';
import { RoleGuard } from '@/components/common/RoleGuard.jsx';
import { MANAGEMENT_ROLES, ROLES } from '@/constants/roles.js';
import {
  ROOM_TYPE_LABELS,
  FURNITURE_CONDITION_LABELS,
} from '@/constants/status.js';
import {
  useApartmentById,
  useApartmentStatusLogs,
  useFurniture,
  useDeleteFurniture,
} from '../hooks/useBuilding.js';
import { ApartmentForm } from '../components/ApartmentForm.jsx';
import { FurnitureForm } from '../components/FurnitureForm.jsx';
import { StatusChangeForm } from '../components/StatusChangeForm.jsx';
import { format, parseISO } from 'date-fns';

const formatCurrency = (v) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v));

// ── Furniture Tab ──────────────────────────────────────────────────────────────
function FurnitureTab({ apartmentId }) {
  const { data, isLoading } = useFurniture(apartmentId);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { mutate: deleteFurniture, isPending: deleting } = useDeleteFurniture(apartmentId, {
    onSuccess: () => { toast.success('Đã xoá nội thất'); setDeleteTarget(null); },
    onError: (err) => toast.error(err.response?.data?.message || 'Xoá thất bại'),
  });

  const items = Array.isArray(data) ? data : (data?.items ?? []);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{items.length} đồ vật</p>
        <RoleGuard roles={MANAGEMENT_ROLES}>
          <button
            onClick={() => { setEditItem(null); setIsFormOpen(true); }}
            className="btn-primary"
            id="add-furniture-btn"
          >
            <Plus size={14} />
            Thêm nội thất
          </button>
        </RoleGuard>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : items.length === 0 ? (
        <EmptyState message="Chưa có nội thất nào" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tên đồ vật</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Số lượng</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tình trạng</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ghi chú</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{item.item_name}</td>
                  <td className="px-4 py-3 text-gray-600">{item.quantity}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${
                      item.condition === 'NEW' ? 'bg-green-100 text-green-800' :
                      item.condition === 'GOOD' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {FURNITURE_CONDITION_LABELS[item.condition] ?? item.condition}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{item.note || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <RoleGuard roles={MANAGEMENT_ROLES}>
                        <button
                          onClick={() => { setEditItem(item); setIsFormOpen(true); }}
                          className="btn-ghost py-1 px-2 text-xs"
                          id={`edit-furniture-${item.id}`}
                        >
                          <Edit2 size={13} />
                        </button>
                      </RoleGuard>
                      <RoleGuard roles={[ROLES.ADMIN]}>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="btn-ghost py-1 px-2 text-xs text-red-500 hover:bg-red-50"
                          id={`delete-furniture-${item.id}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </RoleGuard>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isFormOpen && (
        <FurnitureForm
          onClose={() => { setIsFormOpen(false); setEditItem(null); }}
          apartmentId={apartmentId}
          furniture={editItem}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Xoá nội thất"
          message={`Bạn có chắc muốn xoá "${deleteTarget.item_name}"?`}
          confirmText="Xoá"
          isLoading={deleting}
          onConfirm={() => deleteFurniture(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// ── Status Logs Tab ────────────────────────────────────────────────────────────
function StatusLogsTab({ apartmentId }) {
  const { data, isLoading } = useApartmentStatusLogs(apartmentId);
  const logs = Array.isArray(data) ? data : [];

  if (isLoading) return <LoadingSpinner />;
  if (logs.length === 0) return <EmptyState message="Chưa có lịch sử trạng thái" />;

  return (
    <div className="space-y-3">
      {logs.map((log, i) => (
        <div key={log.id ?? i} className="card p-4 flex items-start gap-4">
          <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-700">
                {log.old_status} → {log.new_status}
              </span>
            </div>
            {log.reason && (
              <p className="text-xs text-gray-500 mt-1">Lý do: {log.reason}</p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">
              {log.user?.full_name ?? 'Hệ thống'} •{' '}
              {log.created_at ? format(parseISO(log.created_at), 'dd/MM/yyyy HH:mm') : ''}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ApartmentDetailPage() {
  const { id } = useParams();
  const apartmentId = Number(id);
  const [activeTab, setActiveTab] = useState('furniture');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  const { data: apartment, isLoading } = useApartmentById(apartmentId);

  if (isLoading) return <LoadingSpinner />;
  if (!apartment) return <EmptyState message="Không tìm thấy căn hộ" />;

  const tabs = [
    { key: 'furniture', label: 'Nội thất' },
    { key: 'status-logs', label: 'Lịch sử trạng thái' },
    { key: 'contract', label: 'Hợp đồng hiện tại' },
  ];

  const activeContract = apartment.contracts?.find((c) => c.status === 'ACTIVE' || c.status === 'EXPIRING_SOON');

  return (
    <div>
      <PageHeader
        title={apartment.apartment_code}
        subtitle={`${ROOM_TYPE_LABELS[apartment.room_type] ?? apartment.room_type} • Tầng ${apartment.floor?.floor_number} / ${apartment.floor?.building?.name}`}
        backUrl="/apartments"
        action={
          <div className="flex gap-2">
            <RoleGuard roles={MANAGEMENT_ROLES}>
              <button onClick={() => setIsStatusOpen(true)} className="btn-secondary" id="change-status-btn">
                <RefreshCw size={14} />
                Đổi trạng thái
              </button>
              <button onClick={() => setIsEditOpen(true)} className="btn-secondary" id="edit-apt-btn">
                <Edit2 size={14} />
                Sửa thông tin
              </button>
            </RoleGuard>
          </div>
        }
      />

      {/* Info Card */}
      <div className="card p-5 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="info-label">Trạng thái</p>
            <div className="mt-0.5"><ApartmentStatusBadge status={apartment.status} /></div>
          </div>
          <div>
            <p className="info-label">Diện tích</p>
            <p className="info-value">{apartment.area_sqm} m²</p>
          </div>
          <div>
            <p className="info-label">Giá cơ bản</p>
            <p className="info-value">{formatCurrency(apartment.base_price)}</p>
          </div>
          <div>
            <p className="info-label">Đặt cọc</p>
            <p className="info-value">{formatCurrency(apartment.deposit_amount)}</p>
          </div>
          <div>
            <p className="info-label">Sức chứa</p>
            <p className="info-value">{apartment.max_occupants} người</p>
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

      {activeTab === 'furniture' && <FurnitureTab apartmentId={apartmentId} />}
      {activeTab === 'status-logs' && <StatusLogsTab apartmentId={apartmentId} />}
      {activeTab === 'contract' && (
        <div>
          {activeContract ? (
            <div className="card p-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="info-label">Khách thuê</p>
                  <Link to={`/tenants/${activeContract.tenant?.id}`} className="text-sm text-blue-600 hover:underline mt-0.5 inline-block">
                    {activeContract.tenant?.full_name}
                  </Link>
                </div>
                <div>
                  <p className="info-label">Giá thuê</p>
                  <p className="info-value">{formatCurrency(activeContract.monthly_rent)}/tháng</p>
                </div>
                <div>
                  <p className="info-label">Ngày bắt đầu</p>
                  <p className="info-value">{format(parseISO(activeContract.start_date), 'dd/MM/yyyy')}</p>
                </div>
                <div>
                  <p className="info-label">Ngày kết thúc</p>
                  <p className="info-value">{format(parseISO(activeContract.end_date), 'dd/MM/yyyy')}</p>
                </div>
              </div>
              <div className="mt-4">
                <Link to={`/contracts/${activeContract.id}`} className="btn-secondary">
                  Xem hợp đồng →
                </Link>
              </div>
            </div>
          ) : (
            <EmptyState message="Không có hợp đồng đang hiệu lực" />
          )}
        </div>
      )}

      {isEditOpen && (
        <ApartmentForm onClose={() => setIsEditOpen(false)} apartment={apartment} />
      )}
      {isStatusOpen && (
        <StatusChangeForm onClose={() => setIsStatusOpen(false)} apartment={apartment} />
      )}
    </div>
  );
}
