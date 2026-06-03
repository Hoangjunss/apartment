// modules/auth/frontend/pages/DashboardPage.jsx
import ReceptionistDashboard from './ReceptionistDashboard.jsx';
import TechnicianDashboard from './TechnicianDashboard.jsx';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Building2, 
  FileText, 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Receipt, 
  Percent, 
  ChevronRight, 
  Activity, 
  CreditCard, 
  Home,
  RefreshCw
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { ContractStatusBadge } from '@/components/common/StatusBadge.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/queryKeys.js';
import { api } from '@/lib/axios.js';
import { format, parseISO, differenceInDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend as RechartsLegend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

const formatCurrency = (v) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v));

const formatValue = (v) => {
  const num = Number(v);
  if (num >= 1000000) {
    return `${(num / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} triệu đ`;
  }
  return `${new Intl.NumberFormat('vi-VN').format(num)} đ`;
};

const getRelativeTime = (timeStr) => {
  if (!timeStr) return '';
  const date = new Date(timeStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ngày trước`;
};

// ── Stat Card ──────────────────────────────────────────────────────────────────
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

// ── Skeleton Components ─────────────────────────────────────────────────────────
function StatCardSkeleton() {
  return (
    <div className="card p-6 animate-pulse space-y-3 bg-white">
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-slate-200 rounded w-2/3" />
          <div className="h-8 bg-slate-200 rounded w-1/2" />
          <div className="h-3 bg-slate-200 rounded w-3/4" />
        </div>
        <div className="w-12 h-12 rounded-xl bg-slate-200" />
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="card p-6 animate-pulse h-[350px] flex flex-col justify-between bg-white">
      <div className="h-4 bg-slate-200 rounded w-1/3" />
      <div className="flex-1 flex items-end gap-4 mt-6">
        <div className="bg-slate-200 w-full h-[60%] rounded" />
        <div className="bg-slate-200 w-full h-[80%] rounded" />
        <div className="bg-slate-200 w-full h-[40%] rounded" />
        <div className="bg-slate-200 w-full h-[90%] rounded" />
      </div>
    </div>
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

const ROOM_TYPE_MAP = {
  STUDIO: 'Studio',
  ONE_BR: 'Căn hộ 1 PN',
  TWO_BR: 'Căn hộ 2 PN',
  THREE_BR: 'Căn hộ 3 PN'
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

// ── Dashboard Page ────────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Queries
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data.data)
  });

  const { data: revenueData, isLoading: loadingRevenue } = useQuery({
    queryKey: ['dashboard', 'revenue'],
    queryFn: () => api.get('/dashboard/revenue?months=6').then(r => r.data.data)
  });

  const { data: typeData, isLoading: loadingTypes } = useQuery({
    queryKey: ['dashboard', 'types'],
    queryFn: () => api.get('/dashboard/apartment-types').then(r => r.data.data)
  });

  const { data: unpaidInvoices, isLoading: loadingUnpaid } = useQuery({
    queryKey: ['dashboard', 'unpaid-invoices'],
    queryFn: () => api.get('/dashboard/unpaid-invoices').then(r => r.data.data)
  });

  const { data: activities, isLoading: loadingActivities } = useQuery({
    queryKey: ['dashboard', 'activities'],
    queryFn: () => api.get('/dashboard/recent-activities').then(r => r.data.data)
  });

  const { data: expiringSoon, isLoading: loadingExp } = useQuery({
    queryKey: QUERY_KEYS.expiringSoon,
    queryFn: () => api.get('/contract/expiring-soon').then(r => r.data.data),
    staleTime: 1000 * 60 * 5,
  });

  const expiringSoonList = Array.isArray(expiringSoon)
    ? expiringSoon
    : (expiringSoon?.items ?? []);
  // ─ Phân nhánh theo role ───────────────────────────────────────────────────────────
  if (user?.role === 'TECHNICIAN') return <TechnicianDashboard />;
  if (user?.role === 'RECEPTIONIST') return <ReceptionistDashboard />;

  // ─ Full dashboard — ADMIN + MANAGER ───────────────────────────────────────────────

  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Chào buổi sáng' : today.getHours() < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  // Pie chart calculation
  const totalAptCount = typeData?.reduce((sum, t) => sum + t.count, 0) || 1;
  const pieData = typeData?.map((t) => ({
    name: ROOM_TYPE_MAP[t.type] || t.type,
    value: t.count,
    percentage: Math.round((t.count / totalAptCount) * 100)
  })) || [];

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title={`${greeting}, ${user?.full_name?.split(' ').pop()}! 👋`}
        subtitle={format(today, "EEEE, dd MMMM yyyy", { locale: vi })}
      />

      {/* SECTION 1 — STAT CARDS (4+4 layout) */}
      <div className="space-y-4">
        {/* Hàng 1 — Tổng quan bất động sản */}
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng quan bất động sản</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loadingStats ? (
            Array(4).fill(0).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <StatCard
                title="Căn hộ còn trống"
                value={`${stats?.emptyApartments} / ${stats?.totalApartments}`}
                icon={Building2}
                color="bg-emerald-500"
                sub="Sẵn sàng đón khách thuê"
                onClick={() => navigate('/apartments?status=AVAILABLE')}
              />
              <StatCard
                title="Đang thuê"
                value={stats?.activeContracts}
                icon={TrendingUp}
                color="bg-blue-500"
                sub="Hợp đồng đang có hiệu lực"
                onClick={() => navigate('/contracts?status=ACTIVE')}
              />
              <StatCard
                title="Khách thuê hoạt động"
                value={stats?.activeTenants}
                icon={Users}
                color="bg-indigo-500"
                sub="Khách hàng đang lưu trú"
                onClick={() => navigate('/tenants')}
              />
              <StatCard
                title="HĐ sắp hết hạn"
                value={stats?.expiringContracts}
                icon={AlertTriangle}
                color="bg-orange-500"
                sub="Trong vòng 30 ngày tới"
                onClick={() => navigate('/contracts?status=EXPIRING_SOON')}
              />
            </>
          )}
        </div>

        {/* Hàng 2 — Tài chính tháng này */}
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider pt-2">Tài chính & Hiệu suất</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loadingStats ? (
            Array(6).fill(0).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <StatCard
                title="Doanh thu tháng này"
                value={formatValue(stats?.revenueThisMonth)}
                icon={DollarSign}
                color="bg-green-500"
                sub="Tổng tiền thuê thực tế đã thu"
                onClick={() => navigate('/invoices?status=PAID')}
              />
              <StatCard
                title="Chi phí tháng này"
                value={formatValue(stats?.expensesThisMonth)}
                icon={TrendingDown}
                color="bg-rose-500"
                sub="Tổng chi phí tòa nhà đã thanh toán"
                onClick={() => navigate('/expenses')}
              />
              <StatCard
                title="Lợi nhuận gộp"
                value={formatValue(stats?.grossProfit)}
                icon={TrendingUp}
                color="bg-blue-600"
                sub="Doanh thu thực tế - Chi phí"
              />
              <StatCard
                title="Còn cần thu"
                value={formatValue(stats?.unpaidAmount)}
                icon={Receipt}
                color="bg-orange-500"
                sub="Tổng hóa đơn chưa nộp tiền"
                onClick={() => navigate('/invoices?status=OVERDUE')}
              />
              <StatCard
                title="Hóa đơn chưa thanh toán"
                value={`${stats?.unpaidCount} hóa đơn`}
                icon={FileText}
                color="bg-amber-500"
                sub="Hóa đơn pending thanh toán"
                onClick={() => navigate('/invoices?status=UNPAID')}
              />
              <div className="card p-6 bg-white flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 pr-2">
                    <p className="text-sm text-gray-500 font-medium">Tỉ lệ lấp đầy</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.occupancyRate}%</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-500">
                    <Percent size={22} className="text-white" />
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 mt-4 overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full transition-all duration-500" style={{ width: `${stats?.occupancyRate}%` }} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* SECTION 2 — BIỂU ĐỒ (2 cột) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Doanh thu 6 tháng gần nhất */}
        {loadingRevenue ? (
          <ChartSkeleton />
        ) : (
          <div className="card p-6 bg-white space-y-4">
            <h2 className="text-base font-bold text-gray-900">Biểu đồ doanh thu vs chi phí 6 tháng gần nhất</h2>
            <div className="h-[280px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}Tr`} />
                  <RechartsTooltip 
                    formatter={(value) => [formatCurrency(value), '']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <RechartsLegend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '13px' }} />
                  <Bar name="Doanh thu thực tế" dataKey="collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar name="Chi phí tòa nhà" dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  <Bar name="Doanh thu chưa thu" dataKey="uncollected" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tỉ lệ loại phòng */}
        {loadingTypes ? (
          <ChartSkeleton />
        ) : (
          <div className="card p-6 bg-white space-y-4">
            <h2 className="text-base font-bold text-gray-900">Biểu đồ tỉ lệ loại phòng</h2>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 h-[280px]">
              <div className="w-[180px] h-[180px] flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(v) => [`${v} căn`, '']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legends details */}
              <div className="flex-1 space-y-2 w-full">
                {pieData.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                      <span className="text-slate-600">{item.name}</span>
                    </div>
                    <span className="text-slate-800">{item.value} căn ({item.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3 — 3 BẢNG THÔNG TIN */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Bảng 1 — Hợp đồng sắp hết hạn */}
        <div className="card bg-white overflow-hidden xl:col-span-2">
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

          {loadingExp ? (
            <TableSkeleton />
          ) : expiringSoonList.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              Không có hợp đồng nào sắp hết hạn
            </div>
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
                  {expiringSoonList.slice(0, 5).map((contract) => {
                    const daysLeft = differenceInDays(parseISO(contract.end_date), today);
                    return (
                      <tr
                        key={contract.id}
                        className="hover:bg-slate-50 transition"
                      >
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
                            className="btn-primary py-1 px-2.5 text-xs inline-flex items-center gap-1"
                          >
                            <RefreshCw size={11} />
                            Gia hạn
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

        {/* Bảng 3 — Hoạt động gần đây */}
        <div className="card bg-white p-5 space-y-4 row-span-2">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b pb-3">
            <Activity size={18} className="text-blue-600" />
            Hoạt động gần đây
          </h2>

          {loadingActivities ? (
            <div className="animate-pulse space-y-4">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-200 rounded w-3/4" />
                    <div className="h-2 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities?.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Chưa có hoạt động nào được ghi nhận.</p>
          ) : (
            <div className="space-y-4">
              {activities?.map((act, idx) => {
                const isContract = act.type === 'CONTRACT';
                const isUtility = act.type === 'UTILITY';
                const isInvoice = act.type === 'INVOICE';
                
                const Icon = isContract ? FileText : isUtility ? Activity : isInvoice ? CreditCard : Home;
                const iconColor = isContract ? 'bg-blue-100 text-blue-600' : isUtility ? 'bg-amber-100 text-amber-600' : isInvoice ? 'bg-emerald-100 text-emerald-600' : 'bg-purple-100 text-purple-600';

                return (
                  <div key={idx} className="flex gap-3 text-sm items-start">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconColor}`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-xs">{act.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{act.detail}</p>
                      <span className="text-[10px] text-gray-400 mt-0.5 block">{getRelativeTime(act.time)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bảng 2 — Hóa đơn chưa thanh toán */}
        <div className="card bg-white overflow-hidden xl:col-span-2">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt size={18} className="text-rose-500" />
              <h2 className="text-sm font-bold text-gray-900">Hóa đơn chưa thanh toán</h2>
            </div>
            <button
              onClick={() => navigate('/invoices')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              Xem tất cả →
            </button>
          </div>

          {loadingUnpaid ? (
            <TableSkeleton />
          ) : unpaidInvoices?.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              Không có hóa đơn chưa thanh toán nào
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="px-4 py-3 text-left">Mã HĐ</th>
                    <th className="px-4 py-3 text-left">Căn hộ</th>
                    <th className="px-4 py-3 text-left">Khách thuê</th>
                    <th className="px-4 py-3 text-left">Kỳ</th>
                    <th className="px-4 py-3 text-left">Số tiền</th>
                    <th className="px-4 py-3 text-left">Hạn nộp</th>
                    <th className="px-4 py-3 text-right">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {unpaidInvoices?.map((inv) => {
                    const daysDiff = differenceInDays(parseISO(inv.due_date), today);
                    const isOverdue = daysDiff < 0;
                    const isExpiring = daysDiff >= 0 && daysDiff <= 5;
                    
                    const badgeText = isOverdue ? 'Quá hạn' : isExpiring ? 'Sắp đến hạn' : 'Trong hạn';
                    const badgeColor = isOverdue ? 'bg-red-50 text-red-700 border border-red-200' : isExpiring ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200';

                    return (
                      <tr
                        key={inv.id}
                        className="hover:bg-slate-50 transition"
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-indigo-600 hover:underline cursor-pointer" onClick={() => navigate(`/invoices/${inv.id}`)}>
                          {inv.invoice_code}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800">
                          {inv.apartment?.apartment_code ?? '—'}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {inv.contract?.tenant?.full_name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {inv.billing_month}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900 text-xs">
                          {formatCurrency(inv.remaining_amount)}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {format(parseISO(inv.due_date), 'dd/MM/yyyy')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`badge ${badgeColor} text-[10px] uppercase font-bold tracking-wider`}>
                            {badgeText}
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
