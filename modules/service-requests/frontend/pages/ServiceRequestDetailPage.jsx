// modules/service-requests/frontend/pages/ServiceRequestDetailPage.jsx
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Home, Clock } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { LoadingSpinner } from '@/components/common/LoadingSpinner.jsx';
import { EmptyState } from '@/components/common/EmptyState.jsx';
import { RoleGuard } from '@/components/common/RoleGuard.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { MANAGEMENT_ROLES } from '@/constants/roles.js';
import { useServiceRequestById, useAssignServiceRequest, useUpdateServiceRequestStatus } from '../hooks/useServiceRequests.js';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_LABELS = {
  PENDING: { label: 'Chờ xử lý', color: 'bg-amber-100 text-amber-700' },
  IN_PROGRESS: { label: 'Đang xử lý', color: 'bg-blue-100 text-blue-700' },
  RESOLVED: { label: 'Đã xong', color: 'bg-emerald-100 text-emerald-700' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_LABELS[status] ?? { label: status, color: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

export default function ServiceRequestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: req, isLoading } = useServiceRequestById(Number(id));

  const { mutate: updateStatus, isPending: updatingStatus } = useUpdateServiceRequestStatus({
    onSuccess: () => toast.success('Cập nhật trạng thái thành công!'),
    onError: (err) => toast.error(err.response?.data?.message || 'Cập nhật thất bại'),
  });

  if (isLoading) return <LoadingSpinner />;
  if (!req) return <EmptyState message="Không tìm thấy yêu cầu kỹ thuật" />;

  const canUpdateStatus =
    MANAGEMENT_ROLES.includes(user?.role) ||
    (user?.role === 'TECHNICIAN' && req.assigned_to === user?.id);

  const statusFlow = { PENDING: 'IN_PROGRESS', IN_PROGRESS: 'RESOLVED' };
  const nextStatus = statusFlow[req.status];
  const nextLabel = { IN_PROGRESS: 'Bắt đầu xử lý', RESOLVED: 'Đánh dấu hoàn thành' };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/service-requests')} className="btn-ghost p-2">
          <ArrowLeft size={18} />
        </button>
        <span className="text-sm font-medium text-slate-500">Quay lại danh sách</span>
      </div>

      <PageHeader
        title={req.title}
        subtitle={`Yêu cầu #${req.id} · Tạo lúc ${req.created_at ? format(parseISO(req.created_at), 'HH:mm dd/MM/yyyy') : ''}`}
        action={
          <div className="flex items-center gap-3">
            <StatusBadge status={req.status} />
            {canUpdateStatus && nextStatus && (
              <button
                onClick={() => updateStatus({ id: req.id, status: nextStatus })}
                disabled={updatingStatus}
                className="btn-primary"
              >
                {updatingStatus ? 'Đang lưu...' : nextLabel[nextStatus]}
              </button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5 space-y-4 bg-white">
            <div>
              <p className="info-label">Mô tả chi tiết</p>
              <p className="text-sm text-slate-700 mt-2 leading-relaxed whitespace-pre-wrap">{req.description}</p>
            </div>
          </div>

          {/* Apartment info */}
          {req.apartment && (
            <div className="card p-5 bg-white space-y-2">
              <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Home size={15} className="text-blue-500" />
                Căn hộ liên quan
              </p>
              <div className="flex items-center gap-3">
                <span className="font-mono font-semibold text-indigo-600">{req.apartment.apartment_code}</span>
                <span className="text-slate-400">·</span>
                <span className="text-sm text-slate-600">
                  {req.apartment.floor?.building?.name} / Tầng {req.apartment.floor?.floor_number}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          <div className="card p-5 bg-white space-y-4">
            <div>
              <p className="info-label flex items-center gap-1"><User size={12} />Người tạo yêu cầu</p>
              <p className="text-sm font-medium text-slate-800 mt-1">{req.requester?.full_name ?? '—'}</p>
              <p className="text-xs text-slate-400">{req.requester?.role}</p>
            </div>
            <div>
              <p className="info-label flex items-center gap-1"><User size={12} />Được phân công cho</p>
              {req.assignee ? (
                <>
                  <p className="text-sm font-medium text-slate-800 mt-1">{req.assignee.full_name}</p>
                  <p className="text-xs text-slate-400">{req.assignee.role}</p>
                </>
              ) : (
                <p className="text-sm text-slate-400 mt-1">Chưa phân công</p>
              )}
            </div>
            <div>
              <p className="info-label flex items-center gap-1"><Clock size={12} />Ngày tạo</p>
              <p className="text-sm text-slate-800 mt-1">
                {req.created_at ? format(parseISO(req.created_at), 'dd/MM/yyyy HH:mm') : '—'}
              </p>
            </div>
            <div>
              <p className="info-label flex items-center gap-1"><Clock size={12} />Cập nhật lần cuối</p>
              <p className="text-sm text-slate-800 mt-1">
                {req.updated_at ? format(parseISO(req.updated_at), 'dd/MM/yyyy HH:mm') : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
