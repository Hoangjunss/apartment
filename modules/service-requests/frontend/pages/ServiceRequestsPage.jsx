// modules/service-requests/frontend/pages/ServiceRequestsPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Wrench, ChevronRight, User } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { LoadingSpinner } from '@/components/common/LoadingSpinner.jsx';
import { EmptyState } from '@/components/common/EmptyState.jsx';
import { RoleGuard } from '@/components/common/RoleGuard.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { MANAGEMENT_ROLES, FINANCE_ACCESS_ROLES } from '@/constants/roles.js';
import { useServiceRequests, useMyServiceRequests, useAssignServiceRequest } from '../hooks/useServiceRequests.js';
import { CreateServiceRequestForm } from '../components/CreateServiceRequestForm.jsx';
import { AssignForm } from '../components/AssignForm.jsx';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

const STATUS_LABELS = {
  PENDING: { label: 'Chờ xử lý', color: 'bg-amber-100 text-amber-700' },
  ASSIGNED: { label: 'Đã phân công', color: 'bg-indigo-100 text-indigo-700' },
  IN_PROGRESS: { label: 'Đang xử lý', color: 'bg-blue-100 text-blue-700' },
  RESOLVED: { label: 'Đã xong', color: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: 'Đã hủy', color: 'bg-rose-100 text-rose-700' },
};

const SOURCE_LABELS = {
  INTERNAL: { label: 'Nội bộ', color: 'bg-green-50 text-green-700 border border-green-200' },
  PUBLIC_FORM: { label: 'Khách thuê', color: 'bg-orange-50 text-orange-700 border border-orange-200' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_LABELS[status] ?? { label: status, color: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function SourceBadge({ source }) {
  const cfg = SOURCE_LABELS[source] ?? { label: source || 'Nội bộ', color: 'bg-gray-50 text-gray-700 border border-gray-200' };
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function RequestRow({ req, onAssign }) {
  const navigate = useNavigate();
  return (
    <tr
      className="hover:bg-slate-50 transition cursor-pointer"
      onClick={() => navigate(`/service-requests/${req.id}`)}
    >
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-slate-800">{req.title}</p>
        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{req.description}</p>
      </td>
      <td className="px-4 py-3">
        {req.apartment ? (
          <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
            {req.apartment.apartment_code}
          </span>
        ) : <span className="text-slate-400 text-xs">—</span>}
      </td>
      <td className="px-4 py-3">
        <SourceBadge source={req.source} />
      </td>
      <td className="px-4 py-3">
        <p className="text-xs font-semibold text-slate-700">{req.requester_name ?? '—'}</p>
        {req.requester_phone && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{req.requester_phone}</p>}
      </td>
      <td className="px-4 py-3">
        {req.assignee ? (
          <div className="flex items-center gap-1.5">
            <User size={12} className="text-slate-400" />
            <span className="text-xs text-slate-700">{req.assignee.full_name}</span>
          </div>
        ) : (
          <RoleGuard roles={MANAGEMENT_ROLES}>
            <button
              onClick={(e) => { e.stopPropagation(); onAssign(req); }}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              + Assign
            </button>
          </RoleGuard>
        )}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={req.status} />
      </td>
      <td className="px-4 py-3 text-xs text-slate-400">
        {req.created_at ? format(parseISO(req.created_at), 'dd/MM/yyyy') : '—'}
      </td>
      <td className="px-4 py-3 text-right">
        <ChevronRight size={16} className="text-slate-400 ml-auto" />
      </td>
    </tr>
  );
}

export default function ServiceRequestsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  const isManager = MANAGEMENT_ROLES.includes(user?.role);

  // ADMIN/MANAGER thấy tất cả, các role khác thấy của mình
  const { data: allRequests, isLoading: loadingAll } = useServiceRequests(
    statusFilter ? { status: statusFilter } : {}
  );
  const { data: myRequests, isLoading: loadingMy } = useMyServiceRequests();

  const requests = isManager ? (allRequests ?? []) : (myRequests ?? []);
  const isLoading = isManager ? loadingAll : loadingMy;

  const { mutate: assign } = useAssignServiceRequest({
    onSuccess: () => { toast.success('Đã assign thành công!'); setAssignTarget(null); },
    onError: (err) => toast.error(err.response?.data?.message || 'Assign thất bại'),
  });

  const statuses = ['', 'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED'];
  const statusLabels = { '': 'Tất cả', ...Object.fromEntries(Object.entries(STATUS_LABELS).map(([k, v]) => [k, v.label])) };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yêu cầu kỹ thuật"
        subtitle={isManager ? 'Quản lý tất cả yêu cầu từ nhân viên' : 'Yêu cầu kỹ thuật của bạn'}
        action={
          <RoleGuard roles={FINANCE_ACCESS_ROLES}>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="btn-primary flex items-center gap-2"
              id="create-service-request-btn"
            >
              <Plus size={16} />
              Tạo yêu cầu mới
            </button>
          </RoleGuard>
        }
      />

      {/* Filter — chỉ hiện cho ADMIN/MANAGER */}
      {isManager && (
        <div className="flex gap-2 flex-wrap">
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {statusLabels[s]}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden bg-white">
        {isLoading ? (
          <LoadingSpinner />
        ) : requests.length === 0 ? (
          <EmptyState
            message={isManager ? 'Chưa có yêu cầu kỹ thuật nào' : 'Bạn chưa có yêu cầu kỹ thuật nào'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="px-4 py-3 text-left">Tiêu đề / Mô tả</th>
                  <th className="px-4 py-3 text-left">Căn hộ</th>
                  <th className="px-4 py-3 text-left">Nguồn</th>
                  <th className="px-4 py-3 text-left">Người yêu cầu</th>
                  <th className="px-4 py-3 text-left">Phân công</th>
                  <th className="px-4 py-3 text-left">Trạng thái</th>
                  <th className="px-4 py-3 text-left">Ngày tạo</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map(req => (
                  <RequestRow key={req.id} req={req} onAssign={setAssignTarget} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isCreateOpen && (
        <CreateServiceRequestForm onClose={() => setIsCreateOpen(false)} />
      )}
      {assignTarget && (
        <AssignForm
          request={assignTarget}
          onClose={() => setAssignTarget(null)}
          onSubmit={(assignedTo) => assign({ id: assignTarget.id, assigned_to: assignedTo })}
        />
      )}
    </div>
  );
}
