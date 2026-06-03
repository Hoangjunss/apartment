// modules/audit-log/frontend/components/AuditHistoryTab.jsx
// Extensible: nhận resourceType + resourceId, tự động fetch audit history
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios.js';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ChevronDown, ChevronRight, History, User } from 'lucide-react';
import { AuditDetailModal } from './AuditDetailModal.jsx';

const ACTION_STYLES = {
  CREATE: { label: 'Tạo mới', dotColor: 'bg-green-400', textColor: 'text-green-700', badgeColor: 'bg-green-50 text-green-700' },
  UPDATE: { label: 'Cập nhật', dotColor: 'bg-blue-400', textColor: 'text-blue-700', badgeColor: 'bg-blue-50 text-blue-700' },
  DELETE: { label: 'Xóa', dotColor: 'bg-red-400', textColor: 'text-red-700', badgeColor: 'bg-red-50 text-red-700' },
};

// Mapping resourceType -> API endpoint prefix
// Extensible: thêm mapping mới không cần sửa component
const RESOURCE_ENDPOINTS = {
  Contract: (id) => `/contract/${id}/audit-history`,
  Tenant: (id) => `/tenant/tenants/${id}/audit-history`,
  Apartment: (id) => `/building/apartments/${id}/audit-history`,
  // Invoice: (id) => `/finance/invoices/${id}/audit-history`,  ← thêm sau
};

function TimelineItem({ log, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const style = ACTION_STYLES[log.action] || ACTION_STYLES.UPDATE;

  const hasChanges = log.old_data || log.new_data;

  return (
    <>
      <div className="flex gap-3 relative">
        {/* Timeline line */}
        {!isLast && (
          <div className="absolute left-[11px] top-6 bottom-0 w-px bg-gray-100" />
        )}

        {/* Dot */}
        <div className={`w-[22px] h-[22px] rounded-full border-2 border-white shadow-sm shrink-0 mt-0.5 ${style.dotColor}`} />

        {/* Content */}
        <div className="flex-1 pb-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${style.badgeColor}`}>
                  {style.label}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <User size={11} />
                  {log.actor_name || `User #${log.actor_id}`}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {format(new Date(log.created_at), "dd/MM/yyyy 'lúc' HH:mm", { locale: vi })}
              </p>
            </div>
            <button
              onClick={() => setDetailOpen(true)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium shrink-0 px-2 py-1 hover:bg-blue-50 rounded transition-colors"
              id={`audit-view-detail-${log.id}`}
            >
              Xem chi tiết
            </button>
          </div>

          {/* Expandable diff preview */}
          {hasChanges && (
            <div className="mt-1.5">
              <button
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                {expanded ? 'Ẩn thay đổi' : 'Xem thay đổi'}
              </button>
              {expanded && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg space-y-1">
                  {log.new_data && Object.entries(log.new_data).map(([key, val]) => {
                    const oldVal = log.old_data?.[key];
                    const changed = oldVal !== undefined && JSON.stringify(oldVal) !== JSON.stringify(val);
                    if (!changed && log.action !== 'CREATE') return null;
                    return (
                      <div key={key} className="text-xs flex gap-2 items-start">
                        <span className="text-gray-400 font-mono w-28 shrink-0">{key}:</span>
                        {changed && <span className="text-red-500 line-through font-mono">{String(oldVal)}</span>}
                        {changed && <span className="text-gray-400">→</span>}
                        <span className="text-green-700 font-mono">{String(val)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {detailOpen && <AuditDetailModal log={log} onClose={() => setDetailOpen(false)} />}
    </>
  );
}

/**
 * AuditHistoryTab — component tái sử dụng cho mọi resource type.
 *
 * @param {string} resourceType - 'Contract' | 'Tenant' | 'Apartment' | ...
 * @param {number} resourceId   - ID của resource
 */
export function AuditHistoryTab({ resourceType, resourceId }) {
  const [page, setPage] = useState(1);
  const limit = 15;

  const endpoint = RESOURCE_ENDPOINTS[resourceType]?.(resourceId);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['audit-history', resourceType, resourceId, page],
    queryFn: async () => {
      if (!endpoint) throw new Error(`Unsupported resourceType: ${resourceType}`);
      const res = await api.get(endpoint, { params: { page, limit } });
      return res.data.data;
    },
    enabled: !!resourceId && !!endpoint,
  });

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  if (!endpoint) {
    return (
      <div className="py-8 text-center text-sm text-gray-400">
        Audit history chưa được hỗ trợ cho loại dữ liệu này.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (isError) {
    return <div className="py-6 text-center text-sm text-red-500">Không thể tải lịch sử thay đổi.</div>;
  }

  return (
    <div className="py-4">
      {items.length === 0 ? (
        <div className="py-10 text-center">
          <History size={32} className="mx-auto text-gray-200 mb-2" />
          <p className="text-sm text-gray-400">Chưa có lịch sử thay đổi nào.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-4">{total} thao tác được ghi nhận</p>
          <div className="relative">
            {items.map((log, idx) => (
              <TimelineItem key={log.id} log={log} isLast={idx === items.length - 1} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                id="audit-history-prev"
              >
                Trước
              </button>
              <span className="text-xs text-gray-500">Trang {page}/{totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                id="audit-history-next"
              >
                Tiếp
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
