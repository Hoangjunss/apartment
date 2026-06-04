import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios.js';
import { Phone, Home, FileText, AlertTriangle, User } from 'lucide-react';
import { ContractStatusBadge } from './StatusBadge.jsx';

const formatCurrency = (v) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v));

export function TenantQuickPreview({ tenantId, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const hoverTimeout = useRef(null);
  const triggerRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tenant-preview', tenantId],
    queryFn: () => api.get(`/tenant/tenants/${tenantId}/preview`).then((r) => r.data.data),
    enabled: isOpen && !!tenantId,
    staleTime: 1000 * 30, // Cache for 30s
  });

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX + rect.width / 2,
      });
    }
  };

  const handleMouseEnter = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => {
      updateCoords();
      setIsOpen(true);
    }, 300); // 300ms delay to prevent accidental hovers
  };

  const handleMouseLeave = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  useEffect(() => {
    if (!isOpen) return;

    updateCoords();

    const handleScrollOrResize = () => {
      updateCoords();
    };

    // Use capturing phase (true) for scroll event to detect scrolling in nested table containers
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span 
        ref={triggerRef}
        className="cursor-help hover:text-blue-600 border-b border-dashed border-gray-400 hover:border-blue-600 transition-colors"
      >
        {children}
      </span>

      {isOpen && createPortal(
        <div 
          className="fixed z-[9999] w-72 p-4 bg-white rounded-xl shadow-xl border border-slate-100 text-left transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
          style={{
            position: 'absolute',
            top: `${coords.top - 8}px`,
            left: `${coords.left}px`,
            transform: 'translate(-50%, -100%)',
          }}
          onMouseEnter={() => {
            if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
          }}
          onMouseLeave={handleMouseLeave}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : isError ? (
            <p className="text-xs text-red-500 text-center py-2">Không thể tải thông tin xem nhanh</p>
          ) : !data ? (
            <p className="text-xs text-gray-400 text-center py-2">Không tìm thấy thông tin khách thuê</p>
          ) : (
            <div className="space-y-3">
              {/* Header profile info */}
              <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
                <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0 text-blue-600 font-bold text-sm">
                  {data.full_name?.split(' ').pop()?.[0]?.toUpperCase() || <User size={16} />}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-800 truncate">{data.full_name}</h4>
                  <div className="flex items-center gap-1 mt-0.5">
                    {data.contract_status ? (
                      <ContractStatusBadge status={data.contract_status} />
                    ) : (
                      <span className="text-[10px] text-gray-400 font-medium">Chưa có hợp đồng</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Detail fields */}
              <div className="space-y-2 text-xs">
                {/* Phone */}
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone size={13} className="text-slate-400 shrink-0" />
                  <a 
                    href={`tel:${data.phone}`} 
                    className="hover:underline hover:text-blue-600 transition-colors"
                  >
                    {data.phone}
                  </a>
                </div>

                {/* Apartment */}
                <div className="flex items-center gap-2 text-gray-600">
                  <Home size={13} className="text-slate-400 shrink-0" />
                  {data.apartment_code ? (
                    <span className="font-medium text-slate-800">
                      Căn hộ: <span className="font-mono text-indigo-600">{data.apartment_code}</span>
                    </span>
                  ) : (
                    <span className="text-gray-400">Chưa nhận phòng</span>
                  )}
                </div>

                {/* Outstanding debt */}
                <div className="flex items-center gap-2 text-gray-600 pt-1">
                  {data.outstanding_debt > 0 ? (
                    <>
                      <AlertTriangle size={13} className="text-red-500 shrink-0" />
                      <span className="font-semibold text-red-600">
                        Nợ đọng: {formatCurrency(data.outstanding_debt)}
                      </span>
                    </>
                  ) : (
                    <>
                      <FileText size={13} className="text-emerald-500 shrink-0" />
                      <span className="font-medium text-emerald-600">Không nợ hóa đơn</span>
                    </>
                  )}
                </div>
              </div>

              {/* View profile button link */}
              <div className="pt-2 border-t border-gray-100 flex justify-end">
                <Link 
                  to={`/tenants/${data.id}`}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-0.5"
                >
                  Xem hồ sơ đầy đủ &rarr;
                </Link>
              </div>
            </div>
          )}

          {/* Small Arrow indicator at bottom of tooltip */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white" />
        </div>,
        document.body
      )}
    </div>
  );
}
