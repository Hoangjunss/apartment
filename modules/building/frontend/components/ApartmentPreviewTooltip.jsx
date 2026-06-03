import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useApartmentPreview } from '../hooks/useBuilding.js';
import { ApartmentStatusBadge } from '@/components/common/StatusBadge.jsx';
import { ROOM_TYPE_LABELS } from '@/constants/status.js';
import { Loader2, User, Phone, Home, Layers, DollarSign, Image as ImageIcon } from 'lucide-react';

const formatCurrency = (v) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v || 0));

export function ApartmentPreviewTooltip({ apartmentId, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const hoverTimeoutRef = useRef(null);
  const targetRef = useRef(null);

  // Fetch data only if open
  const { data, isLoading } = useApartmentPreview(apartmentId, isOpen);

  const handleMouseEnter = (e) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    
    const target = e.currentTarget;
    targetRef.current = target;

    hoverTimeoutRef.current = setTimeout(() => {
      const rect = target.getBoundingClientRect();
      // Calculate coordinates to place above the target, centered horizontally
      const tooltipWidth = 320; // fixed width of hover card
      const tooltipHeight = 280; // approximate height

      let left = rect.left + window.scrollX + rect.width / 2 - tooltipWidth / 2;
      let top = rect.top + window.scrollY - tooltipHeight - 10; // 10px spacing

      // Bound checks
      if (left < 10) left = 10;
      if (left + tooltipWidth > window.innerWidth) {
        left = window.innerWidth - tooltipWidth - 10;
      }
      if (rect.top < tooltipHeight + 20) {
        // Position below target if not enough space above
        top = rect.bottom + window.scrollY + 10;
      }

      setCoords({ top, left });
      setIsOpen(true);
    }, 350); // 350ms hover delay
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsOpen(false);
  };

  return (
    <span
      ref={targetRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="inline-block relative cursor-help border-b border-dashed border-indigo-400 text-indigo-700 font-semibold"
    >
      {children}

      {isOpen &&
        createPortal(
          <div
            style={{
              position: 'absolute',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: '320px',
            }}
            className="bg-white border border-slate-100 rounded-xl shadow-xl z-[9999] pointer-events-none p-4 animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-2">
                <Loader2 size={24} className="animate-spin text-indigo-600" />
                <span className="text-xs text-slate-400">Đang tải thông tin...</span>
              </div>
            ) : data ? (
              <div className="space-y-3">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-50 pb-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Home size={14} className="text-indigo-600" />
                      Căn hộ {data.apartment_code}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                      {data.location.building_name} · Tầng {data.location.floor_number}
                    </p>
                  </div>
                  <ApartmentStatusBadge status={data.status} />
                </div>

                {/* Body Details */}
                <div className="grid grid-cols-2 gap-2 text-xs border-b border-slate-50 pb-2.5">
                  <div className="space-y-1">
                    <span className="text-slate-400 block text-[10px]">Loại phòng</span>
                    <span className="font-semibold text-slate-700">{ROOM_TYPE_LABELS[data.room_type] || data.room_type}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400 block text-[10px]">Diện tích</span>
                    <span className="font-semibold text-slate-700">{data.area_sqm} m²</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400 block text-[10px]">Giá cơ bản</span>
                    <span className="font-semibold text-slate-700">{formatCurrency(data.base_price)}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400 block text-[10px]">Tiền đặt cọc</span>
                    <span className="font-semibold text-slate-700">{formatCurrency(data.deposit_amount)}</span>
                  </div>
                </div>

                {/* Active Occupancy (if rented) */}
                {data.status === 'OCCUPIED' && data.tenant ? (
                  <div className="bg-indigo-50/50 rounded-lg p-2.5 space-y-1.5">
                    <span className="text-[9px] font-bold text-indigo-800 uppercase tracking-wider block">Hợp đồng hiện tại</span>
                    <div className="flex items-center gap-2 text-xs text-slate-700">
                      <User size={12} className="text-indigo-500 shrink-0" />
                      <span className="font-medium">{data.tenant.full_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-700">
                      <Phone size={12} className="text-indigo-500 shrink-0" />
                      <span>{data.tenant.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-700">
                      <DollarSign size={12} className="text-indigo-500 shrink-0" />
                      <span>Giá thuê: <strong className="text-indigo-600">{formatCurrency(data.monthly_rent)}</strong></span>
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 italic text-center py-1">
                    Chưa có hợp đồng hoạt động (Phòng trống)
                  </div>
                )}

                {/* Mini Image Gallery */}
                {data.images && data.images.length > 0 ? (
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 block flex items-center gap-1">
                      <ImageIcon size={10} /> Hình ảnh căn hộ ({data.images.length})
                    </span>
                    <div className="flex gap-1.5 overflow-x-auto py-1 scrollbar-thin">
                      {data.images.map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          alt={`Apartment preview ${i + 1}`}
                          className="w-16 h-12 rounded object-cover border border-slate-100 shrink-0"
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1 bg-slate-50 rounded py-1">
                    <ImageIcon size={10} /> Không có hình ảnh đính kèm
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-rose-500 text-center py-4">Lỗi khi tải thông tin</div>
            )}
          </div>,
          document.body
        )}
    </span>
  );
}
