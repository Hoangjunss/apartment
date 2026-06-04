import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios.js';
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  addMonths, 
  subMonths, 
  addWeeks, 
  subWeeks,
  format,
  parseISO
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  ArrowRight,
  TrendingUp,
  FileText,
  AlertTriangle,
  Receipt
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader.jsx';

export default function CalendarPage() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('MONTH'); // 'MONTH' or 'WEEK'
  const [selectedDayEvents, setSelectedDayEvents] = useState(null); // Day detail modal

  // Calculate intervals based on viewMode
  let startDate, endDate;
  if (viewMode === 'MONTH') {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  } else {
    startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
    endDate = endOfWeek(currentDate, { weekStartsOn: 1 });
  }

  // Fetch events using React Query
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['calendar-events', viewMode, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: () => api.get('/calendar/events', {
      params: {
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd')
      }
    }).then(r => r.data.data),
    keepPreviousData: true
  });

  // Event categories styles
  const eventStyles = {
    CONTRACT_EXPIRY: {
      bg: 'bg-orange-50 border-orange-500 text-orange-800 hover:bg-orange-100',
      dot: 'bg-orange-500',
      label: 'Hết hạn HĐ'
    },
    PAYMENT_DUE: {
      bg: 'bg-red-50 border-red-500 text-red-800 hover:bg-red-100',
      dot: 'bg-red-500',
      label: 'Hạn thanh toán'
    },
    MAINTENANCE: {
      bg: 'bg-blue-50 border-blue-500 text-blue-800 hover:bg-blue-100',
      dot: 'bg-blue-500',
      label: 'Sửa chữa & Bảo trì'
    }
  };

  // Navigations
  const handlePrev = () => {
    if (viewMode === 'MONTH') {
      setCurrentDate(prev => subMonths(prev, 1));
    } else {
      setCurrentDate(prev => subWeeks(prev, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'MONTH') {
      setCurrentDate(prev => addMonths(prev, 1));
    } else {
      setCurrentDate(prev => addWeeks(prev, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleEventClick = (e, event) => {
    e.stopPropagation();
    if (event.type === 'CONTRACT_EXPIRY') {
      navigate(`/contracts/${event.referenceId}`);
    } else if (event.type === 'PAYMENT_DUE') {
      navigate(`/invoices/${event.referenceId}`);
    } else if (event.type === 'MAINTENANCE') {
      navigate(`/service-requests/${event.referenceId}`);
    }
  };

  // Generate days array
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Lịch hoạt động"
        subtitle="Quản lý hạn hợp đồng và hạn đóng tiền hóa đơn"
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('MONTH')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                viewMode === 'MONTH' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-white text-slate-600 border hover:bg-slate-50'
              }`}
            >
              Xem theo tháng
            </button>
            <button
              onClick={() => setViewMode('WEEK')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                viewMode === 'WEEK' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-white text-slate-600 border hover:bg-slate-50'
              }`}
            >
              Xem theo tuần
            </button>
          </div>
        }
      />

      {/* Calendar Header Controls */}
      <div className="card p-4 bg-white flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <CalendarIcon size={20} className="text-blue-600" />
          <h2 className="text-lg font-bold text-slate-800 capitalize">
            {format(currentDate, viewMode === 'MONTH' ? 'MMMM yyyy' : "'Tuần' w - MMMM yyyy", { locale: vi })}
          </h2>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleToday}
            className="px-3 py-1.5 text-xs font-medium bg-slate-50 text-slate-700 border rounded-lg hover:bg-slate-100 transition mr-2"
          >
            Hôm nay
          </button>
          <button
            onClick={handlePrev}
            className="p-2 border rounded-lg hover:bg-slate-50 transition text-slate-600"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleNext}
            className="p-2 border rounded-lg hover:bg-slate-50 transition text-slate-600"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="card bg-white overflow-hidden shadow-sm border border-slate-200">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b bg-slate-50/50">
          {weekDays.map(day => (
            <div key={day} className="px-2 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className={`grid grid-cols-7 divide-x divide-y divide-slate-100 border-l border-t ${
          viewMode === 'MONTH' ? 'grid-rows-5 min-h-[500px]' : 'min-h-[250px]'
        }`}>
          {isLoading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {days.map((day, idx) => {
            const dayEvents = events.filter(e => isSameDay(parseISO(e.start), day));
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isTodayDate = isToday(day);

            return (
              <div
                key={idx}
                onClick={() => {
                  if (dayEvents.length > 0) setSelectedDayEvents({ day, events: dayEvents });
                }}
                className={`p-2 flex flex-col group transition relative ${
                  viewMode === 'MONTH' ? 'min-h-[100px]' : 'min-h-[200px]'
                } ${
                  isCurrentMonth ? 'bg-white' : 'bg-slate-50/40 text-slate-400'
                } ${
                  dayEvents.length > 0 ? 'cursor-pointer hover:bg-slate-50/30' : ''
                }`}
              >
                {/* Date Label */}
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                    isTodayDate 
                      ? 'bg-blue-600 text-white font-bold' 
                      : isCurrentMonth ? 'text-slate-800' : 'text-slate-400'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-bold">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                {/* Event list */}
                <div className="flex-1 space-y-1 overflow-hidden mt-1">
                  {dayEvents.slice(0, 3).map(event => {
                    const style = eventStyles[event.type] || eventStyles.CONTRACT_EXPIRY;
                    return (
                      <div
                        key={event.id}
                        onClick={(e) => handleEventClick(e, event)}
                        className={`px-1.5 py-1 text-[10px] font-medium border-l-2 rounded-r truncate transition ${style.bg}`}
                        title={event.title}
                      >
                        <div className="flex items-center gap-1 font-semibold truncate">
                          <span className={`w-1 h-1 rounded-full shrink-0 ${style.dot}`} />
                          <span className="truncate">{event.title}</span>
                        </div>
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-[9px] text-blue-600 font-bold text-center pt-0.5">
                      + {dayEvents.length - 3} sự kiện khác
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend categories */}
      <div className="flex flex-wrap gap-4 px-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white border px-3 py-1.5 rounded-lg shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          <span>Hợp đồng hết hạn (Contract Expiry)</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white border px-3 py-1.5 rounded-lg shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span>Hạn nộp tiền hóa đơn (Payment Due)</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white border px-3 py-1.5 rounded-lg shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span>Lịch bảo trì & sửa chữa (Maintenance)</span>
        </div>
      </div>

      {/* Day details modal */}
      {selectedDayEvents && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800">Sự kiện ngày</h3>
                <p className="text-xs text-slate-500 capitalize">
                  {format(selectedDayEvents.day, "EEEE, dd MMMM yyyy", { locale: vi })}
                </p>
              </div>
              <button 
                onClick={() => setSelectedDayEvents(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
              >
                &times;
              </button>
            </div>

            {/* Event list detail */}
            <div className="p-5 max-h-[300px] overflow-y-auto space-y-3">
              {selectedDayEvents.events.map(event => {
                const isContract = event.type === 'CONTRACT_EXPIRY';
                const style = eventStyles[event.type] || eventStyles.CONTRACT_EXPIRY;
                const Icon = isContract ? FileText : Receipt;
                
                return (
                  <div 
                    key={event.id}
                    onClick={(e) => {
                      handleEventClick(e, event);
                      setSelectedDayEvents(null);
                    }}
                    className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition ${style.bg}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isContract ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                    }`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {style.label}
                      </p>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5">
                        {event.title}
                      </p>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-2">
                        <Clock size={11} />
                        <span>Cả ngày</span>
                        <ArrowRight size={10} className="mx-1" />
                        <span className="text-blue-600 font-medium">Chi tiết &rarr;</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="btn-secondary text-xs py-1.5 px-4"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
