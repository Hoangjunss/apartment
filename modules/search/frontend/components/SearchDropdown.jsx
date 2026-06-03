import { Link } from 'react-router-dom';
import { User, Home, Building, FileText, Receipt, Loader2 } from 'lucide-react';

export function SearchDropdown({ results, isLoading, query, onClose }) {
  const hasResults =
    results &&
    (results.tenants?.length > 0 ||
      results.apartments?.length > 0 ||
      results.buildings?.length > 0 ||
      results.contracts?.length > 0 ||
      results.invoices?.length > 0);

  if (query.trim().length < 2) {
    return (
      <div className="absolute left-0 mt-2 w-full bg-white rounded-xl shadow-lg border border-slate-100 p-4 text-xs text-slate-400 z-50">
        Nhập tối thiểu 2 ký tự để tìm kiếm...
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="absolute left-0 mt-2 w-full bg-white rounded-xl shadow-lg border border-slate-100 p-6 flex justify-center items-center gap-2 text-xs text-slate-500 z-50">
        <Loader2 size={16} className="animate-spin text-indigo-600" />
        Đang tìm kiếm...
      </div>
    );
  }

  if (!hasResults) {
    return (
      <div className="absolute left-0 mt-2 w-full bg-white rounded-xl shadow-lg border border-slate-100 p-6 text-center text-xs text-slate-400 z-50">
        Không tìm thấy kết quả nào khớp với "{query}".
      </div>
    );
  }

  return (
    <div className="absolute left-0 mt-2 w-full max-h-[400px] overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 space-y-3">
      {/* Category: Tenants */}
      {results.tenants?.length > 0 && (
        <div>
          <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-500 bg-indigo-50/40 flex items-center gap-1.5">
            <User size={12} />
            Khách thuê ({results.tenants.length})
          </div>
          <div className="mt-1 divide-y divide-slate-50">
            {results.tenants.map((t) => (
              <Link
                key={t.id}
                to={`/tenants/${t.id}`}
                onClick={onClose}
                className="flex flex-col px-4 py-2 hover:bg-slate-50 transition-colors"
              >
                <span className="text-xs font-semibold text-slate-700">{t.full_name}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  CCCD: {t.national_id} · SĐT: {t.phone}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Category: Apartments */}
      {results.apartments?.length > 0 && (
        <div>
          <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-500 bg-sky-50/40 flex items-center gap-1.5">
            <Home size={12} />
            Căn hộ ({results.apartments.length})
          </div>
          <div className="mt-1 divide-y divide-slate-50">
            {results.apartments.map((a) => (
              <Link
                key={a.id}
                to={`/apartments/${a.id}`}
                onClick={onClose}
                className="flex flex-col px-4 py-2 hover:bg-slate-50 transition-colors"
              >
                <span className="text-xs font-semibold text-slate-700">Phòng {a.apartment_code}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Tòa nhà: {a.floor?.building?.name || '—'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Category: Buildings */}
      {results.buildings?.length > 0 && (
        <div>
          <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-500 bg-amber-50/40 flex items-center gap-1.5">
            <Building size={12} />
            Tòa nhà ({results.buildings.length})
          </div>
          <div className="mt-1 divide-y divide-slate-50">
            {results.buildings.map((b) => (
              <Link
                key={b.id}
                to={`/buildings/${b.id}`}
                onClick={onClose}
                className="flex flex-col px-4 py-2 hover:bg-slate-50 transition-colors"
              >
                <span className="text-xs font-semibold text-slate-700">{b.name}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Mã tòa nhà: {b.code}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Category: Contracts */}
      {results.contracts?.length > 0 && (
        <div>
          <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-50/40 flex items-center gap-1.5">
            <FileText size={12} />
            Hợp đồng ({results.contracts.length})
          </div>
          <div className="mt-1 divide-y divide-slate-50">
            {results.contracts.map((c) => (
              <Link
                key={c.id}
                to={`/contracts/${c.id}`}
                onClick={onClose}
                className="flex flex-col px-4 py-2 hover:bg-slate-50 transition-colors"
              >
                <span className="text-xs font-semibold text-slate-700">Hợp đồng #{c.contract_code}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Khách đại diện: {c.tenant?.full_name || '—'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Category: Invoices */}
      {results.invoices?.length > 0 && (
        <div>
          <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-500 bg-rose-50/40 flex items-center gap-1.5">
            <Receipt size={12} />
            Hóa đơn ({results.invoices.length})
          </div>
          <div className="mt-1 divide-y divide-slate-50">
            {results.invoices.map((inv) => (
              <Link
                key={inv.id}
                to={`/invoices/${inv.id}`}
                onClick={onClose}
                className="flex flex-col px-4 py-2 hover:bg-slate-50 transition-colors"
              >
                <span className="text-xs font-semibold text-slate-700">Hóa đơn #{inv.invoice_code}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Kỳ hóa đơn: {inv.billing_month}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
