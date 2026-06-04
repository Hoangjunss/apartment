import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Package, 
  Building2, 
  Calendar, 
  DollarSign, 
  Clock, 
  Wrench, 
  FileText, 
  User, 
  ArrowLeft,
  Paperclip,
  Activity,
  SlidersHorizontal
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import toast from 'react-hot-toast';

import { 
  useAssetById, 
  useUpdateAsset, 
  useAssetTimeline, 
  useAssetAttachments 
} from '../hooks/useAssets.js';

export default function AssetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Queries
  const { data: asset, isLoading, error } = useAssetById(id);
  const { data: timeline = [], isLoading: isTimelineLoading } = useAssetTimeline(id);
  const { data: attachments = [], isLoading: isAttachmentsLoading } = useAssetAttachments(id);

  // Update status mutation
  const updateMutation = useUpdateAsset(id, {
    onSuccess: () => {
      toast.success('Cập nhật trạng thái tài sản thành công');
      setIsUpdatingStatus(false);
    },
    onError: (err) => toast.error(err.message || 'Lỗi khi cập nhật trạng thái')
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="bg-red-50 text-red-800 p-6 rounded-xl border border-red-200">
        <h4 className="font-bold">Lỗi truy cập</h4>
        <p className="text-sm mt-1">{error?.message || 'Không tìm thấy tài sản cố định này trong hệ thống.'}</p>
        <button onClick={() => navigate('/assets')} className="mt-4 px-4 py-2 bg-red-800 text-white rounded-lg text-sm font-semibold hover:bg-red-900 transition">
          Quay về danh sách
        </button>
      </div>
    );
  }

  // Handle status update
  const handleStatusChange = (newStatus) => {
    updateMutation.mutate({ status: newStatus });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => navigate('/assets')} 
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{asset.name}</h1>
          <p className="text-sm text-gray-500">Mã tài sản: {asset.asset_code} • Tòa nhà: {asset.building?.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT / CENTER COLUMN: Main details & Depreciation */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main info card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Phân loại</span>
              <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mt-1">
                <Package size={16} className="text-slate-500" />
                {asset.category === 'MACHINERY' ? 'Máy móc/Vận hành' : asset.category}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Ngày mua</span>
              <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mt-1">
                <Calendar size={16} className="text-slate-500" />
                {new Date(asset.purchase_date).toLocaleDateString('vi-VN')}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Thời hạn tính</span>
              <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mt-1">
                <Clock size={16} className="text-slate-500" />
                {asset.useful_life_years} năm
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Trạng thái</span>
              <span className="inline-flex mt-1">
                {asset.status === 'ACTIVE' && <span className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-50 text-emerald-700">Hoạt động</span>}
                {asset.status === 'UNDER_REPAIR' && <span className="px-2.5 py-1 text-xs font-bold rounded bg-amber-50 text-amber-700">Đang sửa chữa</span>}
                {asset.status === 'DECOMMISSIONED' && <span className="px-2.5 py-1 text-xs font-bold rounded bg-rose-50 text-rose-700">Thanh lý</span>}
              </span>
            </div>
          </div>

          {/* Dynamic straight line depreciation card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-gray-950 flex items-center gap-2 border-b border-gray-100 pb-3">
              <DollarSign size={18} className="text-blue-600" /> Khấu hao định giá (Đường thẳng động)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-slate-50 rounded-xl p-4 space-y-1 border border-slate-100">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Nguyên giá mua đầu vào</span>
                <p className="text-lg font-extrabold text-slate-900 mt-1">{Number(asset.purchase_cost).toLocaleString('vi-VN')} đ</p>
                <p className="text-xs text-gray-400">Giá trị thanh lý dự tính: {Number(asset.salvage_value).toLocaleString('vi-VN')} đ</p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 space-y-1 border border-slate-100">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Khấu hao lũy kế</span>
                <p className="text-lg font-extrabold text-rose-600 mt-1">-{asset.depreciation?.accumulatedDepreciation?.toLocaleString('vi-VN')} đ</p>
                <p className="text-xs text-gray-400">Đã khấu hao {asset.depreciation?.monthsUsed} tháng sử dụng</p>
              </div>

              <div className="bg-blue-50/50 rounded-xl p-4 space-y-1 border border-blue-100">
                <span className="text-xs text-blue-600 font-bold uppercase tracking-wider block">Giá trị sổ sách còn lại</span>
                <p className="text-lg font-extrabold text-blue-700 mt-1">{asset.depreciation?.remainingValue?.toLocaleString('vi-VN')} đ</p>
                <p className="text-xs text-blue-500 font-medium">Tỷ lệ còn lại: {((asset.depreciation?.remainingValue / asset.purchase_cost) * 100).toFixed(1)}%</p>
              </div>

            </div>

            {asset.description && (
              <div className="pt-2 text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4 border border-gray-100">
                <span className="font-bold text-gray-700 block mb-1">Mô tả chi tiết:</span>
                {asset.description}
              </div>
            )}
          </div>

          {/* Activity Timeline (Polymorphic logs) */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-gray-950 flex items-center gap-2 border-b border-gray-100 pb-3">
              <Activity size={18} className="text-blue-600" /> Dòng thời gian hoạt động (Asset Timeline)
            </h3>
            
            {isTimelineLoading ? (
              <div className="flex justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              </div>
            ) : timeline.length === 0 ? (
              <p className="text-sm text-gray-400 italic text-center py-4">Chưa có nhật ký hoạt động nào ghi nhận cho tài sản này</p>
            ) : (
              <div className="relative border-l border-gray-200 ml-3 pl-5 space-y-6 pt-2">
                {timeline.map((entry) => (
                  <div key={entry.id} className="relative">
                    <span className="absolute -left-[26px] top-0 w-3 h-3 rounded-full bg-blue-600 border border-white outline outline-4 outline-blue-50" />
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-bold text-gray-900">{entry.title}</h4>
                        <span className="text-xs text-gray-400">{new Date(entry.created_at).toLocaleString('vi-VN')}</span>
                      </div>
                      <p className="text-sm text-gray-500 leading-relaxed">{entry.description}</p>
                      {entry.actor_name && (
                        <span className="text-xs text-gray-400 flex items-center gap-1 font-medium mt-1">
                          <User size={12} /> Thực hiện bởi: {entry.actor_name}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Actions, Attachments, Workorders */}
        <div className="space-y-6">
          
          {/* Quick status controls */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-3">
              <SlidersHorizontal size={16} className="text-slate-500" /> Điều khiển tài sản
            </h3>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Thay đổi trạng thái máy móc</label>
              <button 
                onClick={() => handleStatusChange('ACTIVE')}
                disabled={asset.status === 'ACTIVE'}
                className={`w-full py-2.5 rounded-lg text-sm font-bold transition border ${asset.status === 'ACTIVE' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                Hoạt Động Bình Thường
              </button>
              <button 
                onClick={() => handleStatusChange('UNDER_REPAIR')}
                disabled={asset.status === 'UNDER_REPAIR'}
                className={`w-full py-2.5 rounded-lg text-sm font-bold transition border ${asset.status === 'UNDER_REPAIR' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                Khai Báo Đang Sửa Chữa
              </button>
              <button 
                onClick={() => handleStatusChange('DECOMMISSIONED')}
                disabled={asset.status === 'DECOMMISSIONED'}
                className={`w-full py-2.5 rounded-lg text-sm font-bold transition border ${asset.status === 'DECOMMISSIONED' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                Thanh Lý / Ngừng Sử Dụng
              </button>
            </div>
            <button
              onClick={() => navigate(`/service-requests?asset_id=${asset.id}`)}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition flex items-center justify-center gap-1.5"
            >
              <Wrench size={16} /> Lịch sử sửa chữa sự cố
            </button>
          </div>

          {/* Attachments Section */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-3">
              <Paperclip size={16} className="text-slate-500" /> Tài liệu đính kèm ({attachments.length})
            </h3>
            {isAttachmentsLoading ? (
              <div className="flex justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              </div>
            ) : attachments.length === 0 ? (
              <p className="text-sm text-gray-400 italic text-center py-4">Chưa có tài liệu đính kèm nào (Catalog, CO/CQ, Hợp đồng bảo trì...)</p>
            ) : (
              <div className="space-y-2">
                {attachments.map(att => (
                  <div key={att.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText size={16} className="text-slate-500 shrink-0" />
                      <div className="overflow-hidden">
                        <p className="text-xs font-semibold text-slate-800 truncate" title={att.file_name}>{att.file_name}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{(att.file_size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <a 
                      href={att.file_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="px-2 py-1 text-[10px] bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 rounded font-semibold transition"
                    >
                      Tải xuống
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
