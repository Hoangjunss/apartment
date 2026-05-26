// src/components/common/DataTable.jsx
import { LoadingSpinner } from './LoadingSpinner.jsx';

function TableSkeleton({ columns }) {
  return (
    <tbody className="divide-y divide-gray-100">
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: columns }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-gray-100 rounded animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

export function DataTable({
  columns,
  data,
  total = 0,
  page = 1,
  limit = 20,
  onPageChange,
  isLoading = false,
  emptyMessage = 'Không có dữ liệu',
}) {
  const totalPages = Math.ceil(total / limit);

  // Tính range page hiển thị
  const getPageRange = () => {
    const delta = 2;
    const range = [];
    for (
      let i = Math.max(1, page - delta);
      i <= Math.min(totalPages, page + delta);
      i++
    ) {
      range.push(i);
    }
    return range;
  };

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                  style={col.width ? { width: col.width } : {}}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          {isLoading ? (
            <TableSkeleton columns={columns.length} />
          ) : (
            <tbody className="divide-y divide-gray-100">
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-sm text-gray-400"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                data.map((row, i) => (
                  <tr
                    key={row.id ?? i}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className="px-4 py-3 text-gray-700 align-middle"
                      >
                        {col.render ? col.render(row) : (row[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          )}
        </table>
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
          <span className="text-sm text-gray-500">
            Tổng <strong>{total}</strong> kết quả
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(1)}
              disabled={page <= 1}
              className="btn-ghost text-xs py-1 px-2 disabled:opacity-40"
            >
              «
            </button>
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="btn-ghost text-xs py-1 px-2 disabled:opacity-40"
            >
              ‹
            </button>
            {getPageRange().map((p) => (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`w-8 h-8 text-xs rounded-lg font-medium transition ${
                  p === page
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="btn-ghost text-xs py-1 px-2 disabled:opacity-40"
            >
              ›
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={page >= totalPages}
              className="btn-ghost text-xs py-1 px-2 disabled:opacity-40"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
