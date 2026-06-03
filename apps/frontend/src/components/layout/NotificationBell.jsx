// src/components/layout/NotificationBell.jsx
import { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, Clock, AlertCircle, FileText, Wrench, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/contexts/NotificationContext.jsx';

const TYPE_ICONS = {
  CONTRACT_EXPIRING: FileText,
  INVOICE_OVERDUE: AlertCircle,
  MAINTENANCE_ASSIGNED: Wrench,
  MAINTENANCE_RESOLVED: CheckCheck,
  PAYMENT_RECEIVED: CreditCard,
};

const TYPE_COLORS = {
  CONTRACT_EXPIRING: 'text-amber-500 bg-amber-50',
  INVOICE_OVERDUE: 'text-red-500 bg-red-50',
  MAINTENANCE_ASSIGNED: 'text-blue-500 bg-blue-50',
  MAINTENANCE_RESOLVED: 'text-emerald-500 bg-emerald-50',
  PAYMENT_RECEIVED: 'text-green-500 bg-green-50',
};

const ENTITY_ROUTES = {
  Contract: (id) => `/contracts/${id}`,
  Invoice: (id) => `/invoices/${id}`,
  Tenant: (id) => `/tenants/${id}`,
  Apartment: (id) => `/apartments/${id}`,
  ServiceRequest: (id) => `/service-requests/${id}`,
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { unreadCount, notifications, markAsRead, markAllAsRead } = useNotifications();

  // Đóng dropdown khi click ngoài
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNotifClick = (notif) => {
    if (!notif.is_read) markAsRead(notif.id);
    const route = notif.entity_type && notif.entity_id
      ? ENTITY_ROUTES[notif.entity_type]?.(notif.entity_id)
      : null;
    if (route) navigate(route);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      {/* Bell Button */}
      <button
        id="notification-bell-btn"
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Thông báo"
      >
        <Bell size={18} className="text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">
              Thông báo
              {unreadCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">
                  {unreadCount}
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                id="mark-all-read-btn"
              >
                <CheckCheck size={12} />
                Đọc tất cả
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={32} className="mx-auto text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">Không có thông báo nào</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const Icon = TYPE_ICONS[notif.type] || Bell;
                const colorClass = TYPE_COLORS[notif.type] || 'text-gray-500 bg-gray-50';
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`w-full text-left flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${!notif.is_read ? 'bg-blue-50/40' : ''}`}
                    id={`notification-item-${notif.id}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${!notif.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock size={10} className="text-gray-400" />
                        <span className="text-[10px] text-gray-400">{timeAgo(notif.created_at)}</span>
                        {!notif.is_read && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-100 text-center">
              <button
                onClick={() => { navigate('/admin/audit-logs'); setOpen(false); }}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                id="view-all-notifications-btn"
              >
                Xem lịch sử hoạt động →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
