// modules/auth/frontend/pages/TechnicianDashboard.jsx
import { useNavigate } from 'react-router-dom';
import { Wrench, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { LoadingSpinner } from '@/components/common/LoadingSpinner.jsx';
import { EmptyState } from '@/components/common/EmptyState.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios.js';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  PENDING: {
    label: 'Chờ xử lý',
    color: 'bg-amber-100 text-amber-700',
    icon: Clock,
    next: 'IN_PROGRESS',
    nextLabel: 'Bắt đầu xử lý',
    nextColor: 'btn-primary',
  },
  IN_PROGRESS: {
    label: 'Đang xử lý',
    color: 'bg-blue-100 text-blue-700',
    icon: Wrench,
    next: 'RESOLVED',
    nextLabel: 'Đánh dấu hoàn thành',
    nextColor: 'btn-success',
  },
  RESOLVED: {
    label: 'Đã xong',
    color: 'bg-emerald-100 text-emerald-700',
    icon: CheckCircle2,
    next: null,
    nextLabel: null,
  },
};

function RequestCard({ req }) {
  const qc = useQueryClient();
  const { mutate: updateStatus, isPending } = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/service-requests/${id}/status`, { status }),
    onSuccess: () => {
      toast.success('Cập nhật trạng thái thành công!');
      qc.invalidateQueries({ queryKey: ['service-requests', 'my'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Cập nhật thất bại'),
  });

  const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.PENDING;
  const StatusIcon = cfg.icon;

  return (
    <div className="card p-5 space-y-3 bg-white hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm">{req.title}</p>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{req.description}</p>
        </div>
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shrink-0 ${cfg.color}`}>
          <StatusIcon size={11} />
          {cfg.label}
        </span>
      </div>

      {req.apartment && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
          <Wrench size={12} className="shrink-0 text-slate-400" />
          <span className="font-mono font-semibold text-slate-700">{req.apartment.apartment_code}</span>
          <span>—</span>
          <span>{req.apartment.floor?.building?.name} / Tầng {req.apartment.floor?.floor_number}</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] text-gray-400">
          {req.created_at ? format(parseISO(req.created_at), 'dd/MM/yyyy HH:mm', { locale: vi }) : ''}
        </span>
        {cfg.next && (
          <button
            onClick={() => updateStatus({ id: req.id, status: cfg.next })}
            disabled={isPending}
            className={`${cfg.nextColor ?? 'btn-primary'} py-1.5 px-3 text-xs`}
          >
            {isPending ? 'Đang lưu...' : cfg.nextLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default function TechnicianDashboard() {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data.data),
  });

  const { data: myRequests, isLoading } = useQuery({
    queryKey: ['service-requests', 'my'],
    queryFn: () => api.get('/service-requests/my').then(r => r.data.data),
  });

  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Chào buổi sáng' : today.getHours() < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  const pending = myRequests?.filter(r => r.status === 'PENDING') ?? [];
  const inProgress = myRequests?.filter(r => r.status === 'IN_PROGRESS') ?? [];
  const resolved = myRequests?.filter(r => r.status === 'RESOLVED') ?? [];

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title={`${greeting}, ${user?.full_name?.split(' ').pop()}! 👋`}
        subtitle={format(today, "EEEE, dd MMMM yyyy", { locale: vi })}
      />

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5 bg-white text-center">
          <p className="text-2xl font-bold text-amber-600">{stats?.myPendingTasks ?? pending.length}</p>
          <p className="text-xs text-gray-500 mt-1">Chờ xử lý</p>
        </div>
        <div className="card p-5 bg-white text-center">
          <p className="text-2xl font-bold text-blue-600">{stats?.myInProgressTasks ?? inProgress.length}</p>
          <p className="text-xs text-gray-500 mt-1">Đang xử lý</p>
        </div>
        <div className="card p-5 bg-white text-center">
          <p className="text-2xl font-bold text-emerald-600">{resolved.length}</p>
          <p className="text-xs text-gray-500 mt-1">Đã xong</p>
        </div>
      </div>

      {/* Task list */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <AlertCircle size={16} className="text-amber-500" />
          Việc cần làm ({(pending.length + inProgress.length)} việc)
        </h2>

        {isLoading ? (
          <LoadingSpinner />
        ) : (pending.length + inProgress.length) === 0 ? (
          <EmptyState message="Không có việc nào đang chờ xử lý. Tốt lắm! 🎉" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {[...inProgress, ...pending].map(req => (
              <RequestCard key={req.id} req={req} />
            ))}
          </div>
        )}

        {resolved.length > 0 && (
          <>
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 pt-4 border-t">
              <CheckCircle2 size={16} className="text-emerald-500" />
              Đã hoàn thành ({resolved.length})
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 opacity-60">
              {resolved.slice(0, 4).map(req => (
                <RequestCard key={req.id} req={req} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
