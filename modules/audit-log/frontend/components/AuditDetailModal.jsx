// modules/audit-log/frontend/components/AuditDetailModal.jsx
import { X, User, Clock, Globe, Monitor } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const ACTION_LABELS = {
  CREATE: { label: 'Tạo mới', color: 'bg-green-100 text-green-700' },
  UPDATE: { label: 'Cập nhật', color: 'bg-blue-100 text-blue-700' },
  DELETE: { label: 'Xóa', color: 'bg-red-100 text-red-700' },
};

function DiffTable({ oldData, newData }) {
  if (!oldData && !newData) return null;

  const old = oldData || {};
  const nw = newData || {};
  const allKeys = [...new Set([...Object.keys(old), ...Object.keys(nw)])];

  const changedKeys = allKeys.filter((k) => {
    return JSON.stringify(old[k]) !== JSON.stringify(nw[k]);
  });

  if (changedKeys.length === 0) {
    return <p className="text-xs text-gray-400 italic">Không có thay đổi chi tiết.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-1.5 pr-4 text-gray-500 font-medium w-1/3">Trường</th>
            <th className="text-left py-1.5 pr-4 text-gray-500 font-medium w-1/3">Giá trị cũ</th>
            <th className="text-left py-1.5 text-gray-500 font-medium w-1/3">Giá trị mới</th>
          </tr>
        </thead>
        <tbody>
          {changedKeys.map((key) => (
            <tr key={key} className="border-b border-gray-50">
              <td className="py-1.5 pr-4 font-mono text-gray-600">{key}</td>
              <td className="py-1.5 pr-4">
                {old[key] !== undefined ? (
                  <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded font-mono break-all">
                    {String(old[key])}
                  </span>
                ) : (
                  <span className="text-gray-300 italic">—</span>
                )}
              </td>
              <td className="py-1.5">
                {nw[key] !== undefined ? (
                  <span className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded font-mono break-all">
                    {String(nw[key])}
                  </span>
                ) : (
                  <span className="text-gray-300 italic">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AuditDetailModal({ log, onClose }) {
  if (!log) return null;

  const actionStyle = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-600' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Chi tiết Audit Log #{log.id}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            id={`audit-detail-close-${log.id}`}
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* Summary */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <User size={14} className="text-gray-400" />
              <span className="font-medium">{log.actor_name || `User #${log.actor_id}`}</span>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${actionStyle.color}`}>
              {actionStyle.label}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              {log.resource_type} #{log.resource_id}
            </span>
          </div>

          {/* Time */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock size={12} />
            {format(new Date(log.created_at), "dd/MM/yyyy 'lúc' HH:mm:ss", { locale: vi })}
          </div>

          {/* IP / Metadata */}
          {log.ip_address && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Globe size={12} />
              IP: <span className="font-mono">{log.ip_address}</span>
            </div>
          )}

          {/* Change comparison */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              So sánh thay đổi
            </h3>
            <DiffTable oldData={log.old_data} newData={log.new_data} />
          </div>

          {/* Raw JSON (collapsible in production, shown here for transparency) */}
          {(log.old_data || log.new_data) && (
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-400 hover:text-gray-600">Dữ liệu thô (JSON)</summary>
              <pre className="mt-2 p-3 bg-gray-50 rounded-lg overflow-x-auto text-gray-600 leading-relaxed">
                {JSON.stringify({ old: log.old_data, new: log.new_data }, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
