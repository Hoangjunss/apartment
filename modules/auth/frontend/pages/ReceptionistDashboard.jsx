// modules/auth/frontend/pages/ReceptionistDashboard.jsx
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Receipt, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { ContractStatusBadge } from '@/components/common/StatusBadge.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios.js';
import { format, parseISO, differenceInDays } from 'date-fns';
import { vi } from 'date-fns/locale';

const formatCurrency = (v) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v));

function StatCard({ title, value, icon: Icon, color, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`card p-6 text-left hover:shadow-md transition-shadow w-full ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {value ?? <span className="text-gray-300">—</span>}
          </p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={22} className="text-white" />
        </div>
      </div>
    </button>
  );
}

function TableSkeleton() {
  return (
    <div className="card p-6 animate-pulse space-y-4 bg-white">
      <div className="h-4 bg-slate-200 rounded w-1/4" />
      <div className="space-y-3">
        <div className="h-10 bg-slate-200 rounded" />
        <div className="h-10 bg-slate-200 rounded" />
        <div className="h-10 bg-slate-200 rounded" />
      </div>
    </div>
  );
}

export default function ReceptionistDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data.data)
  });

  const { data: expiringSoon, isLoading: loadingExp } = useQuery({
    queryKey: ['dashboard', 'expiring-soon'],
    queryFn: () => api.get('/contract/expiring-soon').then(r => r.data.data),
    staleTime: 1000 * 60 * 5,
  });

  const { data: unpaidInvoices, isLoading: loadingUnpaid } = useQuery({
    queryKey: ['dashboard', 'unpaid-invoices'],
    queryFn: () => api.get('/dashboard/unpaid-invoices').then(r => r.data.data)
  });

  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Chào buổi sáng' : today.getHours() < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const expiringSoonList = Array.isArray(expiringSoon) ? expiringSoon : (expiringSoon?.items ?? []);

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title={`${greeting}, ${user?.full_name?.split(' ').pop()}! 👋`}
        subtitle={format(today, "EEEE, dd MMMM yyyy", { locale: vi })}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {loadingStats ? (
          <>
            <div className="card p-6 animate-pulse h-28 bg-white" />
            <div className="card p-6 animate-pulse h-28 bg-white" />
          </>
        ) : (
          <>
            <StatCard
              title="Hợp đồng sắp hết hạn"
              value={stats?.expiringContracts ?? '—'}
              icon={AlertTriangle}
              color="bg-orange-500"
              sub="Trong vòng 30 ngày tới"
              onClick={() => navigate('/contracts?status=EXPIRING_SOON')}
            />
            <StatCard
              title="Hóa đơn chưa thanh toán"
              value={`${stats?.unpaidCount ?? '—'} hóa đơn`}
              icon={Receipt}
              color="bg-rose-500"
              sub={stats?.unpaidAmount ? formatCurrency(stats.unpaidAmount) : 'Cần thu'}
              onClick={() => navigate('/invoices?status=UNPAID')}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Hợp đồng sắp hết hạn */}
        <div className="card bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-orange-500" />
              <h2 className="text-sm font-bold text-gray-900">Hợp đồng sắp hết hạn</h2>
            </div>
            <button
              onClick={() => navigate('/contracts?status=EXPIRING_SOON')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              Xem tất cả →
            </button>
          </div>

          {loadingExp ? <TableSkeleton /> : expiringSoonList.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">Không có hợp đồng nào sắp hết hạn</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="px-4 py-3 text-left">Căn hộ</th>
                    <th className="px-4 py-3 text-left">Khách thuê</th>
                    <th className="px-4 py-3 text-left">Hết hạn</th>
                    <th className="px-4 py-3 text-left">Còn lại</th>
                    <th className="px-4 py-3 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expiringSoonList.slice(0, 6).map((contract) => {
                    const daysLeft = differenceInDays(parseISO(contract.end_date), today);
                    return (
                      <tr key={contract.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800">
                          {contract.apartment?.apartment_code ?? '—'}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {contract.tenant?.full_name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {format(parseISO(contract.end_date), 'dd/MM/yyyy')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold text-xs rounded px-2 py-0.5 ${daysLeft <= 7 ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                            {daysLeft} ngày
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => navigate(`/contracts/${contract.id}`)}
                            className="btn-secondary py-1 px-2.5 text-xs inline-flex items-center gap-1"
                          >
                            <RefreshCw size={11} />
                            Xem HĐ
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Hóa đơn chưa thanh toán */}
        <div className="card bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt size={18} className="text-rose-500" />
              <h2 className="text-sm font-bold text-gray-900">Hóa đơn cần thu tiền</h2>
            </div>
            <button
              onClick={() => navigate('/invoices?status=UNPAID')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              Xem tất cả →
            </button>
          </div>

          {loadingUnpaid ? <TableSkeleton /> : unpaidInvoices?.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">Không có hóa đơn chưa thanh toán</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="px-4 py-3 text-left">Căn hộ</th>
                    <th className="px-4 py-3 text-left">Khách thuê</th>
                    <th className="px-4 py-3 text-left">Số tiền còn lại</th>
                    <th className="px-4 py-3 text-left">Hạn nộp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {unpaidInvoices?.slice(0, 6).map((inv) => {
                    const daysDiff = differenceInDays(parseISO(inv.due_date), today);
                    const isOverdue = daysDiff < 0;
                    return (
                      <tr
                        key={inv.id}
                        className="hover:bg-slate-50 transition cursor-pointer"
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800">
                          {inv.apartment?.apartment_code ?? '—'}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {inv.contract?.tenant?.full_name ?? '—'}
                        </td>
                        <td className="px-4 py-3 font-semibold text-rose-600 text-xs">
                          {formatCurrency(inv.remaining_amount)}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className={`font-semibold rounded px-2 py-0.5 ${isOverdue ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                            {isOverdue ? `Quá hạn ${Math.abs(daysDiff)}n` : format(parseISO(inv.due_date), 'dd/MM/yyyy')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
