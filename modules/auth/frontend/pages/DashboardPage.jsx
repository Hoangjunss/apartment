// modules/auth/frontend/pages/DashboardPage.jsx
import { useNavigate } from 'react-router-dom';
import { Building2, FileText, Users, AlertTriangle, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { LoadingSpinner } from '@/components/common/LoadingSpinner.jsx';
import { ContractStatusBadge } from '@/components/common/StatusBadge.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/queryKeys.js';
import { api } from '@/lib/axios.js';
import { format, parseISO, differenceInDays } from 'date-fns';
import { vi } from 'date-fns/locale';

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

// ── Dashboard Page ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Lấy apartments
  const { data: apartmentsData, isLoading: loadingApt } = useQuery({
    queryKey: QUERY_KEYS.apartments({ limit: 1000 }),
    queryFn: () => api.get('/building/apartments', { params: { limit: 1000 } }).then(r => r.data.data),
  });

  // Lấy tenants active
  const { data: tenantsData, isLoading: loadingTen } = useQuery({
    queryKey: QUERY_KEYS.tenants({ status: 'ACTIVE', limit: 1 }),
    queryFn: () => api.get('/tenant/tenants', { params: { status: 'ACTIVE', limit: 1 } }).then(r => r.data.data),
  });

  // Lấy hợp đồng sắp hết hạn
  const { data: expiringSoon, isLoading: loadingExp } = useQuery({
    queryKey: QUERY_KEYS.expiringSoon,
    queryFn: () => api.get('/contract/expiring-soon').then(r => r.data.data),
    staleTime: 1000 * 60 * 5,
  });

  // Tổng hợp apartments theo status
  const apartments = apartmentsData?.items ?? [];
  const statusCount = apartments.reduce((acc, apt) => {
    acc[apt.status] = (acc[apt.status] || 0) + 1;
    return acc;
  }, {});

  const expiringSoonList = Array.isArray(expiringSoon)
    ? expiringSoon
    : (expiringSoon?.items ?? []);

  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Chào buổi sáng' : today.getHours() < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  return (
    <div>
      <PageHeader
        title={`${greeting}, ${user?.full_name?.split(' ').pop()}! 👋`}
        subtitle={format(today, "EEEE, dd MMMM yyyy", { locale: vi })}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Căn hộ còn trống"
          value={loadingApt ? '...' : (statusCount['AVAILABLE'] ?? 0)}
          icon={Building2}
          color="bg-green-500"
          sub={`/ ${apartments.length} tổng căn hộ`}
          onClick={() => navigate('/apartments?status=AVAILABLE')}
        />
        <StatCard
          title="Đang thuê"
          value={loadingApt ? '...' : (statusCount['OCCUPIED'] ?? 0)}
          icon={TrendingUp}
          color="bg-blue-500"
          onClick={() => navigate('/apartments?status=OCCUPIED')}
        />
        <StatCard
          title="Khách thuê đang hoạt động"
          value={loadingTen ? '...' : (tenantsData?.total ?? 0)}
          icon={Users}
          color="bg-indigo-500"
          onClick={() => navigate('/tenants')}
        />
        <StatCard
          title="HĐ sắp hết hạn"
          value={loadingExp ? '...' : expiringSoonList.length}
          icon={AlertTriangle}
          color="bg-orange-500"
          sub="trong vòng 30 ngày"
          onClick={() => navigate('/contracts?status=EXPIRING_SOON')}
        />
      </div>

      {/* Expiring Soon Table */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-orange-500" />
            <h2 className="text-sm font-semibold text-gray-900">Hợp đồng sắp hết hạn</h2>
          </div>
          <button
            onClick={() => navigate('/contracts?status=EXPIRING_SOON')}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Xem tất cả →
          </button>
        </div>

        {loadingExp ? (
          <LoadingSpinner />
        ) : expiringSoonList.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            Không có hợp đồng nào sắp hết hạn
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mã HĐ</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Khách thuê</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Phòng</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ngày hết hạn</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Còn lại</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expiringSoonList.slice(0, 5).map((contract) => {
                  const daysLeft = differenceInDays(parseISO(contract.end_date), today);
                  return (
                    <tr
                      key={contract.id}
                      className="hover:bg-gray-50 cursor-pointer transition"
                      onClick={() => navigate(`/contracts/${contract.id}`)}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        #{contract.id}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {contract.tenant?.full_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {contract.apartment?.apartment_code ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {format(parseISO(contract.end_date), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-medium text-sm ${daysLeft <= 7 ? 'text-red-600' : 'text-orange-600'}`}>
                          {daysLeft} ngày
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ContractStatusBadge status={contract.status} daysLeft={daysLeft} />
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
  );
}
