// modules/audit-log/frontend/pages/AuditLogsPage.jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios.js';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Shield, Search, RotateCcw, Eye, User, Clock, Filter } from 'lucide-react';
import { AuditDetailModal } from '../components/AuditDetailModal.jsx';

const ACTION_OPTIONS = ['CREATE', 'UPDATE', 'DELETE'];
const RESOURCE_OPTIONS = ['Contract', 'Tenant', 'Invoice', 'Payment', 'Apartment', 'Building', 'User'];

const ACTION_BADGES = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
};

const INITIAL_FILTERS = { keyword: '', action: '', resourceType: '', from: '', to: '' };

export default function AuditLogsPage() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);
  const limit = 20;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['audit-logs', appliedFilters, page],
    queryFn: async () => {
      const res = await api.get('/audit-logs', {
        params: { ...appliedFilters, page, limit },
      });
      return res.data.data;
    },
  });

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const handleSearch = () => {
    setAppliedFilters(filters);
    setPage(1);
  };

  const handleReset = () => {
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
          <Shield size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-500">Lịch sử thao tác toàn hệ thống</p>
        </div>
      </div>

      {/* Filter Area */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={14} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Bộ lọc</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Keyword */}
          <div className="lg:col-span-1">
            <label className="text-xs text-gray-500 mb-1 block">Từ khóa</label>
            <input
              type="text"
              placeholder="Tên người thực hiện, resource..."
              value={filters.keyword}
              onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              id="audit-filter-keyword"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          {/* Action */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Action</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              id="audit-filter-action"
            >
              <option value="">Tất cả</option>
              {ACTION_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* Resource Type */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Resource</label>
            <select
              value={filters.resourceType}
              onChange={(e) => setFilters((f) => ({ ...f, resourceType: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              id="audit-filter-resource"
            >
              <option value="">Tất cả</option>
              {RESOURCE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Từ ngày</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              id="audit-filter-from"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Đến ngày</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              id="audit-filter-to"
            />
          </div>

          {/* Actions */}
          <div className="flex items-end gap-2">
            <button
              onClick={handleSearch}
              disabled={isFetching}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
              id="audit-search-btn"
            >
              <Search size={14} />
              Tìm kiếm
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm font-medium rounded-lg transition-colors"
              id="audit-reset-btn"
            >
              <RotateCcw size={14} />
              Đặt lại
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Table Header stats */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {isFetching ? 'Đang tải...' : `${total.toLocaleString()} kết quả`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Thời gian</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Người thực hiện</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Resource</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-5 py-3.5">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${60 + (j * 10) % 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <Shield size={40} className="mx-auto text-gray-200 mb-3" />
                    <p className="text-sm text-gray-400">Không tìm thấy log nào.</p>
                  </td>
                </tr>
              ) : (
                items.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Clock size={12} className="text-gray-400 shrink-0" />
                        {format(new Date(log.created_at), 'dd/MM/yy HH:mm', { locale: vi })}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-[10px] font-bold shrink-0">
                          {log.actor_name?.charAt(0)?.toUpperCase() || 'S'}
                        </div>
                        <span className="text-gray-700 text-xs font-medium">{log.actor_name || `User #${log.actor_id}`}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${ACTION_BADGES[log.action] || 'bg-gray-100 text-gray-600'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-700 font-medium">{log.resource_type}</td>
                    <td className="px-5 py-3.5 text-xs text-gray-500 font-mono">#{log.resource_id || '—'}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="flex items-center gap-1.5 ml-auto text-xs text-blue-600 hover:text-blue-700 font-medium px-2.5 py-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                        id={`audit-view-${log.id}`}
                      >
                        <Eye size={13} />
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              id="audit-page-prev"
            >
              Trước
            </button>
            <span className="text-sm text-gray-500">Trang {page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              id="audit-page-next"
            >
              Tiếp
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && <AuditDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </div>
  );
}
