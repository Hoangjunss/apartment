// modules/building/frontend/pages/ApartmentDetailPage.jsx
import { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Edit2, RefreshCw, Trash2, Plus, QrCode, Copy, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { LoadingSpinner } from '@/components/common/LoadingSpinner.jsx';
import { EmptyState } from '@/components/common/EmptyState.jsx';
import { ApartmentStatusBadge } from '@/components/common/StatusBadge.jsx';
import { ConfirmDialog } from '@/components/common/ConfirmDialog.jsx';
import { RoleGuard } from '@/components/common/RoleGuard.jsx';
import { MANAGEMENT_ROLES, ROLES } from '@/constants/roles.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import {
  ROOM_TYPE_LABELS,
  FURNITURE_CONDITION_LABELS,
} from '@/constants/status.js';
import {
  useApartmentById,
  useApartmentStatusLogs,
  useFurniture,
  useDeleteFurniture,
  useGenerateApartmentToken,
} from '../hooks/useBuilding.js';
import { ApartmentForm } from '../components/ApartmentForm.jsx';
import { FurnitureForm } from '../components/FurnitureForm.jsx';
import { StatusChangeForm } from '../components/StatusChangeForm.jsx';
import { format, parseISO } from 'date-fns';

const formatCurrency = (v) => {
  if (v === null || v === undefined) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v));
};

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
              {log.changed_at ? format(parseISO(log.changed_at), 'dd/MM/yyyy HH:mm') : ''}
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
  const { user } = useAuth();
  const showQR = false; // Tạm ẩn QR code

  const { data: apartment, isLoading } = useApartmentById(apartmentId);
  const { mutate: generateToken, isPending: generating } = useGenerateApartmentToken({
    onSuccess: () => {
      toast.success('Đã tạo mã QR mới thành công!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Tạo QR code thất bại');
    }
  });

  const handleGenerateToken = () => {
    generateToken(apartmentId);
  };

  const handleCopyLink = () => {
    if (!apartment?.tokens?.token) return;
    const link = `${window.location.origin}/submit?t=${apartment.tokens.token}`;
    navigator.clipboard.writeText(link);
    toast.success('Đã sao chép liên kết vào bộ nhớ tạm!');
  };

  const handlePrintQR = () => {
    window.print();
  };

  if (isLoading) return <LoadingSpinner />;
  if (!apartment) return <EmptyState message="Không tìm thấy căn hộ" />;

  const tabs = [
    { key: 'furniture', label: 'Nội thất' },
    { key: 'status-logs', label: 'Lịch sử trạng thái' },
    { key: 'contract', label: 'Hợp đồng hiện tại' },
  ];

  const activeContract = apartment.contracts?.find((c) => c.status === 'ACTIVE' || c.status === 'EXPIRING_SOON');

  return (
    <>
      <div className="print:hidden">
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

        {/* Top Section: Info Card and QR Card */}
        <div className={showQR ? "grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6" : "grid grid-cols-1 gap-6 mb-6"}>
          {/* Info Card */}
          <div className={showQR ? "card p-5 lg:col-span-2" : "card p-5"}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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

          {/* QR Section Card */}
          {showQR && (
            <div className="card p-5 flex flex-col justify-between" id="qr-request-card">
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">QR Code Yêu Cầu Hỗ Trợ</h3>
                {apartment.tokens ? (
                  <div className="space-y-3">
                    <div className="flex justify-center bg-gray-50 p-3 rounded-xl border border-gray-200 relative group">
                      <QRCodeSVG
                        value={`${window.location.origin}/submit?t=${apartment.tokens.token}`}
                        size={140}
                        level="H"
                        includeMargin={true}
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col gap-2 items-center justify-center transition-opacity duration-200 rounded-xl">
                        <button
                          onClick={handlePrintQR}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition"
                        >
                          <Printer size={13} />
                          In QR Code
                        </button>
                      </div>
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-xs text-gray-500">
                        Hạn dùng: <span className="font-semibold text-gray-700">{format(parseISO(apartment.tokens.expires_at), 'dd/MM/yyyy')}</span>
                      </p>
                      <p className="text-[11px] text-gray-400 leading-normal">
                        Khách thuê quét QR để gửi yêu cầu hỗ trợ mà không cần đăng nhập.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center space-y-2.5">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                      <QrCode size={20} />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-gray-700">Chưa tạo QR Code</p>
                      <p className="text-[11px] text-gray-400 max-w-[200px]">Tạo mã QR cho phòng này để nhận yêu cầu sửa chữa/khiếu nại.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100">
                <RoleGuard roles={MANAGEMENT_ROLES}>
                  {apartment.tokens ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleCopyLink}
                        className="btn-secondary w-full justify-center text-xs py-1.5"
                        id="copy-qr-link-btn"
                      >
                        <Copy size={13} />
                        Copy Link
                      </button>
                      <button
                        onClick={handleGenerateToken}
                        disabled={generating}
                        className="btn-primary w-full justify-center text-xs py-1.5 bg-blue-650"
                        id="regenerate-qr-btn"
                      >
                        {generating ? 'Đang tạo...' : 'Tạo lại'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleGenerateToken}
                      disabled={generating}
                      className="btn-primary w-full justify-center text-xs py-1.5"
                      id="generate-qr-btn"
                    >
                      <QrCode size={13} />
                      {generating ? 'Đang tạo...' : 'Tạo QR Code'}
                    </button>
                  )}
                </RoleGuard>
              </div>
            </div>
          )}
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
                  {user?.role !== 'TECHNICIAN' && (
                    <Link to={`/contracts/${activeContract.id}`} className="btn-secondary">
                      Xem hợp đồng →
                    </Link>
                  )}
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

      {/* Printable QR Code View */}
      {apartment.tokens && (
        <div className="hidden print:flex flex-col items-center justify-center min-h-screen text-black bg-white p-8 space-y-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-wide uppercase">Căn Hộ Dịch Vụ Cao Cấp</h1>
          <div className="border-4 border-black p-6 rounded-2xl bg-white">
            <QRCodeSVG
              value={`${window.location.origin}/submit?t=${apartment.tokens.token}`}
              size={320}
              level="H"
            />
          </div>
          <div className="space-y-2">
            <h2 className="text-5xl font-black text-black">PHÒNG {apartment.apartment_code}</h2>
            <p className="text-xl text-gray-700 font-medium">
              {apartment.floor?.building?.name} — Tầng {apartment.floor?.floor_number}
            </p>
          </div>
          <div className="max-w-md pt-6 border-t border-dashed border-gray-400">
            <p className="text-sm font-semibold text-gray-800 uppercase tracking-wider">Hướng dẫn gửi yêu cầu hỗ trợ</p>
            <p className="text-xs text-gray-650 mt-1.5 leading-relaxed">
              Quét mã QR ở trên bằng điện thoại để gửi yêu cầu kỹ thuật, báo hỏng thiết bị, vệ sinh hoặc khiếu nại trực tiếp đến Ban quản lý mà không cần đăng nhập.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
