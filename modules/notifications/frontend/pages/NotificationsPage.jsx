import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios.js';
import { Bell, CheckCheck, Clock, AlertCircle, FileText, Wrench, CreditCard, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { useNotifications } from '@/contexts/NotificationContext.jsx';
import toast from 'react-hot-toast';

const TYPE_ICONS = {
  CONTRACT_EXPIRING: FileText,
  INVOICE_OVERDUE: AlertCircle,
  MAINTENANCE_ASSIGNED: Wrench,
  MAINTENANCE_RESOLVED: CheckCheck,
  MAINTENANCE_REMINDER: Bell,
  PAYMENT_RECEIVED: CreditCard,
};

const TYPE_COLORS = {
  CONTRACT_EXPIRING: 'text-amber-500 bg-amber-50 border-amber-100',
  INVOICE_OVERDUE: 'text-red-500 bg-red-50 border-red-100',
  MAINTENANCE_ASSIGNED: 'text-blue-500 bg-blue-50 border-blue-100',
  MAINTENANCE_RESOLVED: 'text-emerald-500 bg-emerald-50 border-emerald-100',
  MAINTENANCE_REMINDER: 'text-indigo-500 bg-indigo-50 border-indigo-100',
  PAYMENT_RECEIVED: 'text-green-500 bg-green-50 border-green-100',
};

const ENTITY_ROUTES = {
  Contract: (id) => `/contracts/${id}`,
  Invoice: (id) => `/invoices/${id}`,
  Tenant: (id) => `/tenants/${id}`,
  Apartment: (id) => `/apartments/${id}`,
  ServiceRequest: (id) => `/service-requests/${id}`,
};

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('ALL'); // ALL, UNREAD, READ
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Lấy các hàm cập nhật từ NotificationContext để đồng bộ chuông
  const { fetchNotifications: refreshBell, unreadCount, markAsRead: contextMarkAsRead, markAllAsRead: contextMarkAllAsRead } = useNotifications();

  const isReadParam = filter === 'UNREAD' ? 'false' : filter === 'READ' ? 'true' : undefined;

  // Query lấy danh sách thông báo phân trang
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications-list', page, filter],
    queryFn: () =>
      api.get('/notifications', {
        params: {
          page,
          limit: 15,
          isRead: isReadParam,
        },
      }).then((res) => res.data.data),
    placeholderData: (prev) => prev,
  });

  const notifications = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 15);

  // Mutation đánh dấu đã đọc 1 thông báo bằng PATCH
  const markReadMutation = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: (_, id) => {
      // Cập nhật cache danh sách
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] });
      // Cập nhật chuông thông báo
      contextMarkAsRead(id);
    },
  });

  // Mutation đánh dấu tất cả là đã đọc bằng PATCH
  const markAllReadMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      toast.success('Đã đánh dấu đọc tất cả thông báo');
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] });
      contextMarkAllAsRead();
    },
  });

  const handleNotifClick = async (notif) => {
    if (!notif.is_read) {
      markReadMutation.mutate(notif.id);
    }
    const route = notif.entity_type && notif.entity_id
      ? ENTITY_ROUTES[notif.entity_type]?.(notif.entity_id)
      : null;
    if (route) {
      navigate(route);
    }
  };

  const handleMarkAllRead = () => {
    if (unreadCount === 0) return;
    markAllReadMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Thông báo Hệ thống"
        subtitle="Quản lý nhắc nhở, lịch sửa chữa và hoạt động tài chính liên quan đến bạn"
        action={
          unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="btn-secondary flex items-center gap-1.5 py-2 px-4 text-xs font-bold shadow-sm"
              disabled={markAllReadMutation.isPending}
              id="page-mark-all-read-btn"
            >
              <CheckCheck size={14} className="text-indigo-600" />
              Đánh dấu đọc tất cả
            </button>
          )
        }
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Chưa đọc</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">
              {unreadCount}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0 border border-rose-100 font-bold">
            <Bell size={20} className={unreadCount > 0 ? 'animate-bounce' : ''} />
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Tổng thông báo</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">
              {total}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 shrink-0 border border-slate-100 font-bold">
            {total}
          </div>
        </div>
      </div>

      {/* Tabs Filter */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-50 pb-2">
          <div className="flex gap-2">
            {[
              { key: 'ALL', label: 'Tất cả' },
              { key: 'UNREAD', label: `Chưa đọc (${unreadCount})` },
              { key: 'READ', label: 'Đã đọc' }
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => { setFilter(t.key); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filter === t.key
                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 border border-transparent'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400 font-medium">Đang tải danh sách thông báo...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell size={48} className="mx-auto text-slate-200 mb-3" />
            <h4 className="text-sm font-bold text-slate-700">Hộp thư trống</h4>
            <p className="text-xs text-slate-400 mt-1">Bạn không có thông báo nào trong danh mục này.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((notif) => {
              const Icon = TYPE_ICONS[notif.type] || Bell;
              const colorClass = TYPE_COLORS[notif.type] || 'text-slate-500 bg-slate-50';
              const isUnread = !notif.is_read;

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  className={`flex items-start justify-between p-4 rounded-xl hover:bg-slate-50/70 transition-all cursor-pointer border border-transparent hover:border-slate-100/50 mt-1 first:mt-0 ${
                    isUnread ? 'bg-indigo-50/20 border-indigo-50/50' : ''
                  }`}
                >
                  <div className="flex gap-4 items-start flex-1 min-w-0 mr-4">
                    {/* Icon Column */}
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-sm ${colorClass}`}>
                      <Icon size={16} />
                    </div>

                    {/* Content Column */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className={`text-sm truncate ${isUnread ? 'font-bold text-slate-800' : 'font-semibold text-slate-600'}`}>
                          {notif.title}
                        </h4>
                        {isUnread && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap leading-relaxed">{notif.message}</p>
                      
                      {/* Meta & Date */}
                      <div className="flex items-center gap-1.5 mt-2">
                        <Clock size={11} className="text-slate-400" />
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(notif.created_at).toLocaleString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="shrink-0 flex items-center gap-2">
                    {isUnread && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markReadMutation.mutate(notif.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-100 transition-colors shadow-sm"
                        title="Đánh dấu đã đọc"
                        disabled={markReadMutation.isPending}
                      >
                        <Check size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 bg-white">
            <span className="text-xs text-slate-500 font-semibold">
              Hiển thị {notifications.length} / {total} kết quả
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn-secondary p-1.5 text-xs disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              
              <span className="text-xs text-slate-600 font-bold px-2">
                Trang {page} / {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="btn-secondary p-1.5 text-xs disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
