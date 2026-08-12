import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  BarChart3,
  Calendar,
  Building,
  Download,
  Percent,
  Wrench,
  FileText,
  DollarSign,
  TrendingUp,
  Activity,
  RotateCcw,
  Printer,
  Mail,
  Loader2,
  Search,
  X
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { useBuildings } from 'modules/building/frontend/hooks/useBuilding.js';
import {
  useRevenueReport,
  useOccupancyReport,
  useMaintenanceReport,
  useContractsReport
} from '../hooks/useReport.js';
import { downloadExportFile, triggerWeeklyReport, getWeeklyReportCandidates } from '../services/report.api.js';

const formatCurrency = (v) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v || 0));

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function ReportsPage() {
  const [buildingId, setBuildingId] = useState('');
  const [fromMonth, setFromMonth] = useState('');
  const [toMonth, setToMonth] = useState('');
  const [activeTab, setActiveTab] = useState('revenue');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Filters for queries
  const filters = {
    building_id: buildingId || undefined,
    from_month: fromMonth || undefined,
    to_month: toMonth || undefined,
  };

  // Queries
  const { data: buildingsData } = useBuildings({ limit: 100 });
  const buildings = buildingsData?.items ?? [];

  const { data: revenueData = [], isLoading: isRevLoading } = useRevenueReport(filters);
  const { data: occupancyData, isLoading: isOccLoading } = useOccupancyReport({ building_id: filters.building_id });
  const { data: maintenanceData, isLoading: isMaintLoading } = useMaintenanceReport(filters);
  const { data: contractsData, isLoading: isContractLoading } = useContractsReport(filters);

  // Reset filters
  const handleResetFilters = () => {
    setBuildingId('');
    setFromMonth('');
    setToMonth('');
  };

  // Trigger Excel / CSV Export
  const handleExport = async (endpoint, format, defaultFilename) => {
    try {
      const exportParams = {
        ...filters,
        format
      };
      
      toast.loading('Đang chuẩn bị file tải xuống...', { id: 'export-toast' });
      const blob = await downloadExportFile(endpoint, exportParams);
      
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      
      const ext = format === 'csv' ? 'csv' : 'xlsx';
      link.setAttribute('download', `${defaultFilename}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      
      toast.success('Đã tải xuống file thành công!', { id: 'export-toast' });
    } catch (err) {
      console.error(err);
      toast.error('Có lỗi xảy ra khi tải file. Vui lòng thử lại.', { id: 'export-toast' });
    }
  };

  // Trigger print view (which invokes browser PDF printing)
  const handlePrint = () => {
    window.print();
  };

  const handleOpenSendModal = async () => {
    setShowSendModal(true);
    setIsLoadingCandidates(true);
    try {
      const data = await getWeeklyReportCandidates();
      setCandidates(data || []);
      setSelectedUserIds((data || []).map(u => u.id));
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải danh sách người nhận báo cáo.');
    } finally {
      setIsLoadingCandidates(false);
    }
  };

  const handleSendWeeklyReportEmail = async () => {
    if (selectedUserIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất một người nhận.');
      return;
    }
    try {
      setIsSendingEmail(true);
      toast.loading('Đang gửi email báo cáo tuần...', { id: 'email-toast' });
      const res = await triggerWeeklyReport(selectedUserIds);
      
      if (res?.success) {
        toast.success(res.message || 'Gửi email báo cáo tuần thành công!', { id: 'email-toast' });
        setShowSendModal(false);
      } else {
        toast.error(res?.message || 'Gửi email báo cáo tuần thất bại.', { id: 'email-toast' });
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Có lỗi xảy ra khi gửi email.', { id: 'email-toast' });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const filteredCandidates = candidates.filter(user => {
    const q = searchQuery.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(q) ||
      user.email?.toLowerCase().includes(q) ||
      user.role?.toLowerCase().includes(q)
    );
  });

  // Aggregate stats for top cards
  const totalCollectedRevenue = revenueData.reduce((sum, item) => sum + item.actual_collected, 0);
  const occupancyRate = occupancyData?.occupancyRate ?? 0;
  const totalMaintenance = maintenanceData?.total ?? 0;
  const activeContractsCount = contractsData?.statusCounts?.ACTIVE ?? 0;

  return (
    <div className="space-y-6 print:p-0 print:space-y-4">
      {/* Page Header */}
      <div className="print:hidden">
        <PageHeader
          title="Báo cáo thống kê"
          subtitle="Theo dõi doanh thu, tỷ lệ lấp đầy, tình trạng kỹ thuật và hợp đồng căn hộ"
          action={
            <div className="flex gap-2">
              <button
                onClick={handleOpenSendModal}
                className="btn-primary flex items-center gap-1.5"
                id="send-weekly-report-btn"
              >
                <Mail size={16} />
                Gửi báo cáo tuần
              </button>
              <button
                onClick={handlePrint}
                className="btn-secondary flex items-center gap-1.5"
                id="print-report-btn"
              >
                <Printer size={16} />
                In báo cáo (PDF)
              </button>
            </div>
          }
        />
      </div>

      {/* Printable Report Header */}
      <div className="hidden print:block border-b pb-4 mb-4">
        <h1 className="text-2xl font-bold text-slate-900">BÁO CÁO THỐNG KÊ HOẠT ĐỘNG CĂN HỘ</h1>
        <p className="text-sm text-slate-500">
          Ngày xuất báo cáo: {new Date().toLocaleDateString('vi-VN')} | Người lập: Admin/Manager
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm print:hidden">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <Building size={12} /> Tòa nhà
          </label>
          <select
            value={buildingId}
            onChange={(e) => setBuildingId(e.target.value)}
            className="input w-48 text-xs h-9 py-1 px-2"
          >
            <option value="">Tất cả tòa nhà</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <Calendar size={12} /> Từ tháng
          </label>
          <input
            type="month"
            value={fromMonth}
            onChange={(e) => setFromMonth(e.target.value)}
            className="input w-40 text-xs h-9 py-1 px-2"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <Calendar size={12} /> Đến tháng
          </label>
          <input
            type="month"
            value={toMonth}
            onChange={(e) => setToMonth(e.target.value)}
            className="input w-40 text-xs h-9 py-1 px-2"
          />
        </div>

        <div className="flex gap-2">
          {(buildingId || fromMonth || toMonth) && (
            <button
              onClick={handleResetFilters}
              className="btn-ghost h-9 px-3 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-1"
            >
              <RotateCcw size={12} />
              Đặt lại
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Revenue */}
        <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100/50 rounded-xl p-4 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 w-16 h-16 bg-indigo-500/10 rounded-full group-hover:scale-125 transition duration-300 pointer-events-none" />
          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">Tổng thực thu</span>
          <span className="text-lg font-extrabold text-slate-800 mt-2 block font-mono">
            {formatCurrency(totalCollectedRevenue)}
          </span>
          <span className="text-[10px] text-indigo-600 flex items-center gap-1 mt-3">
            <TrendingUp size={12} /> Trong kỳ lọc
          </span>
        </div>

        {/* Card 2: Occupancy Rate */}
        <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-100/50 rounded-xl p-4 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 w-16 h-16 bg-emerald-500/10 rounded-full group-hover:scale-125 transition duration-300 pointer-events-none" />
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Tỷ lệ lấp đầy</span>
          <span className="text-lg font-extrabold text-slate-800 mt-2 block font-mono">
            {occupancyRate}%
          </span>
          <span className="text-[10px] text-emerald-600 flex items-center gap-1 mt-3">
            <Percent size={12} /> Số căn đang ở
          </span>
        </div>

        {/* Card 3: Service Requests */}
        <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-100/50 rounded-xl p-4 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 w-16 h-16 bg-amber-500/10 rounded-full group-hover:scale-125 transition duration-300 pointer-events-none" />
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Sự cố kỹ thuật</span>
          <span className="text-lg font-extrabold text-slate-800 mt-2 block font-mono">
            {totalMaintenance}
          </span>
          <span className="text-[10px] text-amber-600 flex items-center gap-1 mt-3">
            <Wrench size={12} /> Yêu cầu sửa chữa
          </span>
        </div>

        {/* Card 4: Active Contracts */}
        <div className="bg-gradient-to-br from-violet-50 to-white border border-violet-100/50 rounded-xl p-4 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 w-16 h-16 bg-violet-500/10 rounded-full group-hover:scale-125 transition duration-300 pointer-events-none" />
          <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider block">Hợp đồng hiệu lực</span>
          <span className="text-lg font-extrabold text-slate-800 mt-2 block font-mono">
            {activeContractsCount}
          </span>
          <span className="text-[10px] text-violet-600 flex items-center gap-1 mt-3">
            <FileText size={12} /> Hợp đồng đang ở
          </span>
        </div>
      </div>

      {/* Tabs list */}
      <div className="border-b border-slate-200 flex justify-between items-center print:hidden">
        <div className="flex gap-4">
          {[
            { id: 'revenue', label: 'Doanh thu', icon: DollarSign },
            { id: 'occupancy', label: 'Tỷ lệ lấp đầy', icon: Percent },
            { id: 'maintenance', label: 'Sự cố kỹ thuật', icon: Wrench },
            { id: 'contracts', label: 'Hợp đồng', icon: FileText }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-1 border-b-2 font-semibold text-xs transition flex items-center gap-1.5 ${
                  active
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Export options */}
        {activeTab === 'revenue' && (
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => handleExport('/report/export/revenue', 'excel', 'bao_cao_doanh_thu')}
              className="btn-ghost py-1 px-2.5 text-xs flex items-center gap-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <Download size={12} /> Excel
            </button>
            <button
              onClick={() => handleExport('/report/export/revenue', 'csv', 'bao_cao_doanh_thu')}
              className="btn-ghost py-1 px-2.5 text-xs flex items-center gap-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <Download size={12} /> CSV
            </button>
          </div>
        )}
      </div>

      {/* Tabs contents */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm min-h-[400px]">
        {/* TAB 1: REVENUE REPORT */}
        {activeTab === 'revenue' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Biểu đồ đối chiếu doanh thu theo tháng</h3>
                <p className="text-[11px] text-slate-400">Doanh thu dự kiến từ hóa đơn vs Số tiền thực tế đã thu qua các tháng</p>
              </div>
            </div>

            {revenueData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 italic text-xs">
                Không tìm thấy dữ liệu hóa đơn nào trong khoảng thời gian này.
              </div>
            ) : (
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#94A3B8" />
                    <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} tick={{ fontSize: 10 }} stroke="#94A3B8" />
                    <ChartTooltip
                      formatter={(v) => [formatCurrency(v), '']}
                      labelClassName="font-bold text-slate-800 text-xs"
                      contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area
                      type="monotone"
                      name="Dự kiến thu (Hóa đơn)"
                      dataKey="expected_total"
                      stroke="#4F46E5"
                      fillOpacity={1}
                      fill="url(#colorExpected)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      name="Thực tế thu (Đã thu)"
                      dataKey="actual_collected"
                      stroke="#10B981"
                      fillOpacity={1}
                      fill="url(#colorActual)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Detailed table view */}
            <div className="border border-slate-100 rounded-xl overflow-hidden mt-6">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Tháng</th>
                    <th className="py-2.5 px-3 text-right">Tiền thuê</th>
                    <th className="py-2.5 px-3 text-right">Tiền điện</th>
                    <th className="py-2.5 px-3 text-right">Tiền nước</th>
                    <th className="py-2.5 px-3 text-right">Dịch vụ</th>
                    <th className="py-2.5 px-3 text-right">Khác</th>
                    <th className="py-2.5 px-3 text-right font-bold text-indigo-700">Tổng hóa đơn</th>
                    <th className="py-2.5 px-3 text-right font-bold text-emerald-700">Thực thu</th>
                    <th className="py-2.5 px-3 text-right text-rose-600">Còn nợ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {revenueData.map((row) => (
                    <tr key={row.month} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-semibold text-slate-700 font-sans">{row.month}</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(row.expected_rent)}</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(row.expected_electricity)}</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(row.expected_water)}</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(row.expected_service)}</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(row.expected_other)}</td>
                      <td className="py-2 px-3 text-right font-semibold text-indigo-700">{formatCurrency(row.expected_total)}</td>
                      <td className="py-2 px-3 text-right font-semibold text-emerald-700">{formatCurrency(row.actual_collected)}</td>
                      <td className="py-2 px-3 text-right text-rose-600 font-bold">{formatCurrency(row.unpaid_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: OCCUPANCY REPORT */}
        {activeTab === 'occupancy' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Biểu đồ cơ cấu tình trạng căn hộ</h3>
              <p className="text-[11px] text-slate-400">Phân bố căn hộ theo trạng thái phòng hiện tại</p>
            </div>

            {isOccLoading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="animate-spin text-indigo-600" size={24} />
              </div>
            ) : occupancyData?.total === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 italic text-xs">
                Không tìm thấy căn hộ nào thỏa mãn bộ lọc.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                {/* Pie Chart */}
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Đang ở (Occupied)', value: occupancyData?.statusCounts?.OCCUPIED || 0 },
                          { name: 'Trống (Available)', value: occupancyData?.statusCounts?.AVAILABLE || 0 },
                          { name: 'Bảo trì (Maintenance)', value: occupancyData?.statusCounts?.MAINTENANCE || 0 },
                          { name: 'Đã đặt chỗ (Reserved)', value: occupancyData?.statusCounts?.RESERVED || 0 }
                        ].filter(item => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {Array.from({ length: 4 }).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip formatter={(v) => [`${v} căn`, '']} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Details Statistics list */}
                <div className="space-y-4">
                  <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                    <span className="text-xs text-slate-500 block">Tổng số căn hộ</span>
                    <span className="text-2xl font-bold text-slate-800">{occupancyData?.total} căn</span>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      { key: 'OCCUPIED', label: 'Đang cho thuê', color: 'bg-emerald-500' },
                      { key: 'AVAILABLE', label: 'Phòng trống', color: 'bg-blue-500' },
                      { key: 'MAINTENANCE', label: 'Đang bảo trì', color: 'bg-amber-500' },
                      { key: 'RESERVED', label: 'Đã đặt cọc', color: 'bg-red-500' }
                    ].map((item, idx) => {
                      const count = occupancyData?.statusCounts?.[item.key] || 0;
                      const percent = occupancyData?.total > 0 ? ((count / occupancyData.total) * 100).toFixed(1) : 0;
                      return (
                        <div key={item.key} className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${item.color}`} />
                            <span className="text-slate-600 font-medium">{item.label}</span>
                          </div>
                          <span className="font-mono text-slate-700 font-bold">{count} căn ({percent}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MAINTENANCE REPORT */}
        {activeTab === 'maintenance' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Báo cáo tình trạng xử lý sự cố kỹ thuật</h3>
              <p className="text-[11px] text-slate-400">Số lượng các yêu cầu báo hỏng phân chia theo trạng thái tiếp nhận</p>
            </div>

            {isMaintLoading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="animate-spin text-indigo-600" size={24} />
              </div>
            ) : maintenanceData?.total === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 italic text-xs">
                Không tìm thấy yêu cầu báo hỏng nào.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                {/* Bar Chart */}
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Chưa xử lý', count: maintenanceData?.statusCounts?.PENDING || 0, fill: '#EF4444' },
                        { name: 'Đã phân công', count: maintenanceData?.statusCounts?.ASSIGNED || 0, fill: '#F59E0B' },
                        { name: 'Đang sửa', count: maintenanceData?.statusCounts?.IN_PROGRESS || 0, fill: '#3B82F6' },
                        { name: 'Hoàn thành', count: maintenanceData?.statusCounts?.RESOLVED || 0, fill: '#10B981' },
                        { name: 'Hủy bỏ', count: maintenanceData?.statusCounts?.CANCELLED || 0, fill: '#64748B' }
                      ]}
                      margin={{ top: 20, right: 10, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94A3B8" />
                      <YAxis tick={{ fontSize: 10 }} stroke="#94A3B8" />
                      <ChartTooltip formatter={(v) => [`${v} yêu cầu`, '']} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {
                          [
                            { fill: '#EF4444' },
                            { fill: '#F59E0B' },
                            { fill: '#3B82F6' },
                            { fill: '#10B981' },
                            { fill: '#64748B' }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))
                        }
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Details Statistics list */}
                <div className="space-y-4">
                  <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                    <span className="text-xs text-slate-500 block">Tổng số yêu cầu kỹ thuật</span>
                    <span className="text-2xl font-bold text-slate-800">{maintenanceData?.total} yêu cầu</span>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      { key: 'PENDING', label: 'Chưa tiếp nhận', color: 'bg-rose-500' },
                      { key: 'ASSIGNED', label: 'Đã phân công kỹ thuật', color: 'bg-amber-500' },
                      { key: 'IN_PROGRESS', label: 'Đang tiến hành sửa', color: 'bg-blue-500' },
                      { key: 'RESOLVED', label: 'Đã sửa hoàn thành', color: 'bg-emerald-500' },
                      { key: 'CANCELLED', label: 'Đã hủy bỏ', color: 'bg-slate-500' }
                    ].map((item) => {
                      const count = maintenanceData?.statusCounts?.[item.key] || 0;
                      const percent = maintenanceData?.total > 0 ? ((count / maintenanceData.total) * 100).toFixed(1) : 0;
                      return (
                        <div key={item.key} className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${item.color}`} />
                            <span className="text-slate-600 font-medium">{item.label}</span>
                          </div>
                          <span className="font-mono text-slate-700 font-bold">{count} đơn ({percent}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CONTRACT REPORT */}
        {activeTab === 'contracts' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Biểu đồ phân bố trạng thái hợp đồng thuê</h3>
              <p className="text-[11px] text-slate-400">Số lượng hợp đồng được ký mới hoặc gia hạn phân bố theo các trạng thái</p>
            </div>

            {isContractLoading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="animate-spin text-indigo-600" size={24} />
              </div>
            ) : contractsData?.total === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 italic text-xs">
                Không tìm thấy hợp đồng nào thỏa mãn bộ lọc.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                {/* Bar Chart */}
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Đang hoạt động', count: contractsData?.statusCounts?.ACTIVE || 0, fill: '#10B981' },
                        { name: 'Sắp hết hạn', count: contractsData?.statusCounts?.EXPIRING_SOON || 0, fill: '#F59E0B' },
                        { name: 'Đã hết hạn', count: contractsData?.statusCounts?.EXPIRED || 0, fill: '#64748B' },
                        { name: 'Đã thanh lý', count: contractsData?.statusCounts?.TERMINATED || 0, fill: '#EF4444' }
                      ]}
                      margin={{ top: 20, right: 10, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94A3B8" />
                      <YAxis tick={{ fontSize: 10 }} stroke="#94A3B8" />
                      <ChartTooltip formatter={(v) => [`${v} hợp đồng`, '']} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {
                          [
                            { fill: '#10B981' },
                            { fill: '#F59E0B' },
                            { fill: '#64748B' },
                            { fill: '#EF4444' }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))
                        }
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Details Statistics list */}
                <div className="space-y-4">
                  <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                    <span className="text-xs text-slate-500 block">Tổng số hợp đồng</span>
                    <span className="text-2xl font-bold text-slate-800">{contractsData?.total} hợp đồng</span>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      { key: 'ACTIVE', label: 'Đang hiệu lực (hoạt động)', color: 'bg-emerald-500' },
                      { key: 'EXPIRING_SOON', label: 'Hợp đồng sắp hết hạn', color: 'bg-amber-500' },
                      { key: 'EXPIRED', label: 'Đã hết hạn', color: 'bg-slate-500' },
                      { key: 'TERMINATED', label: 'Đã thanh lý trước hạn', color: 'bg-rose-500' }
                    ].map((item) => {
                      const count = contractsData?.statusCounts?.[item.key] || 0;
                      const percent = contractsData?.total > 0 ? ((count / contractsData.total) * 100).toFixed(1) : 0;
                      return (
                        <div key={item.key} className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${item.color}`} />
                            <span className="text-slate-600 font-medium">{item.label}</span>
                          </div>
                          <span className="font-mono text-slate-700 font-bold">{count} hợp đồng ({percent}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Chọn người nhận báo cáo */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Mail className="text-indigo-600" size={18} /> Gửi báo cáo vận hành tuần qua Email
                </h3>
                <p className="text-[11px] text-slate-400">Chọn những quản lý hoặc quản trị viên bạn muốn gửi báo cáo tuần này</p>
              </div>
              <button 
                onClick={() => setShowSendModal(false)}
                className="text-slate-400 hover:text-slate-600 transition p-1 hover:bg-slate-100 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search and Selection Helpers */}
            <div className="p-4 border-b border-slate-50 flex flex-col sm:flex-row gap-3 items-center justify-between bg-white">
              <div className="relative w-full sm:w-72">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  placeholder="Tìm theo tên, email, vai trò..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input pl-9 text-xs h-9 w-full"
                />
              </div>
              
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setSelectedUserIds(filteredCandidates.map(c => c.id))}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition bg-indigo-50 hover:bg-indigo-100/50 px-2.5 py-1.5 rounded-lg"
                >
                  Chọn tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUserIds([])}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-800 transition bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg"
                >
                  Bỏ chọn tất cả
                </button>
              </div>
            </div>

            {/* Candidates list content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isLoadingCandidates ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                  <Loader2 className="animate-spin text-indigo-600" size={24} />
                  <span className="text-xs">Đang tải danh sách người nhận...</span>
                </div>
              ) : filteredCandidates.length === 0 ? (
                <div className="text-center py-20 text-slate-400 text-xs italic">
                  Không tìm thấy người nhận nào phù hợp.
                </div>
              ) : (
                <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                  <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto">
                    {filteredCandidates.map((user) => {
                      const isChecked = selectedUserIds.includes(user.id);
                      return (
                        <div 
                          key={user.id} 
                          onClick={() => {
                            setSelectedUserIds(prev => 
                              isChecked ? prev.filter(id => id !== user.id) : [...prev, user.id]
                            );
                          }}
                          className={`flex items-start gap-3 p-3.5 hover:bg-slate-50/50 transition cursor-pointer ${
                            isChecked ? 'bg-indigo-50/10' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            readOnly
                            className="checkbox mt-1 pointer-events-none"
                          />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-800">{user.full_name}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                user.role === 'ADMIN' 
                                  ? 'bg-indigo-100 text-indigo-800' 
                                  : 'bg-violet-100 text-violet-800'
                              }`}>
                                {user.role}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 truncate mt-0.5">{user.email}</div>
                            
                            {/* Assigned Buildings list */}
                            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-semibold text-slate-400">Tòa nhà:</span>
                              {user.role === 'ADMIN' ? (
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                  Toàn hệ thống
                                </span>
                              ) : user.buildings && user.buildings.length > 0 ? (
                                user.buildings.map(b => (
                                  <span key={b.id} className="text-[10px] font-bold text-indigo-600 bg-indigo-50/70 px-1.5 py-0.5 rounded">
                                    {b.name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded italic">
                                  Chưa phân công
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Đã chọn: <strong className="text-slate-800 font-mono">{selectedUserIds.length}</strong> / {filteredCandidates.length} người
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="btn-secondary text-xs h-9 px-4"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSendWeeklyReportEmail}
                  disabled={isSendingEmail || selectedUserIds.length === 0}
                  className="btn-primary text-xs h-9 px-5 flex items-center gap-1.5 shadow-sm"
                >
                  {isSendingEmail ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <Mail size={14} />
                  )}
                  Xác nhận gửi
                </button>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
