import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  Plus, 
  Search, 
  QrCode, 
  Eye, 
  Trash2, 
  Building2, 
  Calendar,
  X,
  FileDown
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { DataTable } from '@/components/common/DataTable.jsx';
import { RoleGuard } from '@/components/common/RoleGuard.jsx';
import { ROLES } from '@/constants/roles.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

import { useAssets, useCreateAsset, useDeleteAsset } from '../hooks/useAssets.js';
import { useBuildings } from 'modules/building/frontend/hooks/useBuilding.js';

export default function AssetsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Search & Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [page, setPage] = useState(1);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [qrAsset, setQrAsset] = useState(null);

  // Form state
  const [form, setForm] = useState({
    asset_code: '',
    name: '',
    building_id: '',
    category: 'MACHINERY',
    purchase_cost: '',
    salvage_value: '',
    useful_life_years: '',
    purchase_date: '',
    description: ''
  });

  // Queries
  const { data: assetsData, isLoading } = useAssets({ 
    search, 
    category, 
    building_id: buildingId ? +buildingId : undefined,
    page, 
    limit: 10 
  });
  const assets = assetsData?.items ?? [];
  const total = assetsData?.total ?? 0;

  const { data: buildingsData } = useBuildings({ limit: 100 });
  const buildings = buildingsData?.items ?? [];

  // Mutations
  const createMutation = useCreateAsset({
    onSuccess: () => {
      toast.success('Đã khai báo tài sản mới thành công');
      setIsCreateModalOpen(false);
      setForm({
        asset_code: '',
        name: '',
        building_id: '',
        category: 'MACHINERY',
        purchase_cost: '',
        salvage_value: '',
        useful_life_years: '',
        purchase_date: '',
        description: ''
      });
    },
    onError: (err) => toast.error(err.message || 'Lỗi khi khai báo tài sản')
  });

  const deleteMutation = useDeleteAsset({
    onSuccess: () => {
      toast.success('Đã xóa tài sản khỏi hệ thống');
    },
    onError: (err) => toast.error(err.message || 'Lỗi khi xóa tài sản')
  });

  // Columns definition
  const columns = [
    { key: 'asset_code', label: 'Mã tài sản', width: '120px', render: (row) => <span className="font-semibold text-slate-800">{row.asset_code}</span> },
    { key: 'name', label: 'Tên tài sản', render: (row) => (
        <div>
          <span className="font-semibold text-gray-900 block">{row.name}</span>
          <span className="text-xs text-gray-400 font-medium">{row.building?.name}</span>
        </div>
      )
    },
    { key: 'category', label: 'Phân loại', render: (row) => {
        const cats = { ELECTRONICS: 'Điện tử', FURNITURE: 'Nội thất', MACHINERY: 'Máy móc/Vận hành', VEHICLE: 'Phương tiện', OTHER: 'Khác' };
        return <span className="px-2.5 py-1 text-xs rounded-full bg-slate-100 text-slate-700 font-semibold">{cats[row.category] || row.category}</span>;
      }
    },
    { key: 'purchase_cost', label: 'Nguyên giá', render: (row) => `${Number(row.purchase_cost).toLocaleString('vi-VN')} đ` },
    { key: 'depreciation', label: 'Khấu hao đã trích', render: (row) => (
        <div>
          <span className="text-gray-900 block font-semibold">{row.depreciation?.accumulatedDepreciation?.toLocaleString('vi-VN')} đ</span>
          <span className="text-xs text-gray-400 font-medium">Đã khấu hao {row.depreciation?.monthsUsed} tháng</span>
        </div>
      )
    },
    { key: 'remaining_value', label: 'Giá trị còn lại', render: (row) => (
        <span className="font-bold text-blue-600">
          {row.depreciation?.remainingValue?.toLocaleString('vi-VN')} đ
        </span>
      )
    },
    { key: 'status', label: 'Trạng thái', width: '110px', render: (row) => {
        const statusConfig = {
          ACTIVE: { label: 'Hoạt động', className: 'bg-emerald-50 text-emerald-700' },
          UNDER_REPAIR: { label: 'Đang sửa', className: 'bg-amber-50 text-amber-700' },
          DECOMMISSIONED: { label: 'Thanh lý', className: 'bg-rose-50 text-rose-700 bg-rose-50/50' }
        };
        const conf = statusConfig[row.status] || { label: row.status, className: 'bg-gray-100 text-gray-600' };
        return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${conf.className}`}>{conf.label}</span>;
      }
    },
    { key: 'actions', label: '', width: '200px', render: (row) => (
        <div className="flex gap-2">
          <button 
            onClick={() => navigate(`/assets/${row.id}`)}
            className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition font-semibold flex items-center gap-1"
          >
            <Eye size={12} /> Chi tiết
          </button>
          <button 
            onClick={() => setQrAsset(row)}
            className="px-2 py-1 text-xs rounded bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 transition font-semibold flex items-center gap-1"
          >
            <QrCode size={12} /> Mã QR
          </button>
          <RoleGuard roles={[ROLES.ADMIN]}>
            <button 
              onClick={() => {
                if (window.confirm('Bạn có chắc chắn muốn xóa tài sản này?')) {
                  deleteMutation.mutate(row.id);
                }
              }}
              className="px-2 py-1 text-xs rounded bg-rose-50 text-rose-700 hover:bg-rose-100 transition font-semibold"
            >
              Xóa
            </button>
          </RoleGuard>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Quản lý Tài sản cố định" 
        subtitle="Quản lý thông số máy móc, thang máy, máy phát điện và thiết bị tòa nhà"
        action={
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 text-sm font-semibold shadow-sm"
          >
            <Plus size={16} /> Khai báo tài sản
          </button>
        }
      />

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Tìm theo tên, mã..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <select 
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">Tất cả phân loại</option>
            <option value="ELECTRONICS">Thiết bị điện tử</option>
            <option value="FURNITURE">Nội thất cố định</option>
            <option value="MACHINERY">Máy móc vận hành</option>
            <option value="VEHICLE">Phương tiện di chuyển</option>
            <option value="OTHER">Khác</option>
          </select>
        </div>
        <div>
          <select 
            value={buildingId}
            onChange={(e) => { setBuildingId(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">Tất cả tòa nhà</option>
            {buildings.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      <DataTable 
        columns={columns}
        data={assets}
        total={total}
        page={page}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyMessage="Không tìm thấy tài sản cố định nào"
      />

      {/* MODAL QR CODE PREVIEW */}
      {qrAsset && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-5 text-center relative border border-gray-100">
            <button 
              onClick={() => setQrAsset(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-900 transition"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-gray-950">Tem mã QR Tài sản</h3>
            
            {/* Stamp content */}
            <div className="bg-slate-50 border border-dashed border-gray-300 p-4 rounded-xl flex flex-col items-center justify-center space-y-3">
              <QRCodeSVG 
                value={`${window.location.origin}/assets/code/${qrAsset.asset_code}`}
                size={140}
                level="H"
                includeMargin={true}
              />
              <div>
                <p className="font-bold text-slate-800 text-sm tracking-wider uppercase">{qrAsset.asset_code}</p>
                <p className="font-semibold text-gray-900 text-xs mt-0.5">{qrAsset.name}</p>
                <p className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">{qrAsset.building?.name}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setQrAsset(null)}
                className="flex-1 py-2 text-sm font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
              >
                Đóng lại
              </button>
              <button 
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition flex items-center justify-center gap-1.5"
              >
                <FileDown size={14} /> In nhãn dán
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ASSET CREATE */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl space-y-4 relative border border-gray-100">
            <button 
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-900 transition"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-gray-950 flex items-center gap-2">
              <Package size={18} className="text-blue-600" /> Khai báo tài sản cố định mới
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Mã tài sản (Unique)</label>
                <input 
                  type="text" 
                  value={form.asset_code} 
                  onChange={(e) => setForm({...form, asset_code: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Ví dụ: AST-0001"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Tên tài sản</label>
                <input 
                  type="text" 
                  value={form.name} 
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Ví dụ: Thang máy Otis Block A"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Đặt tại Tòa nhà</label>
                <select 
                  value={form.building_id} 
                  onChange={(e) => setForm({...form, building_id: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Chọn tòa nhà...</option>
                  {buildings.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Phân loại tài sản</label>
                <select 
                  value={form.category} 
                  onChange={(e) => setForm({...form, category: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="ELECTRONICS">Thiết bị điện tử</option>
                  <option value="FURNITURE">Nội thất cố định</option>
                  <option value="MACHINERY">Máy móc vận hành</option>
                  <option value="VEHICLE">Phương tiện di chuyển</option>
                  <option value="OTHER">Khác</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nguyên giá mua (đ)</label>
                <input 
                  type="number" 
                  value={form.purchase_cost} 
                  onChange={(e) => setForm({...form, purchase_cost: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Giá mua ban đầu..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Giá trị thu hồi ước tính (đ)</label>
                <input 
                  type="number" 
                  value={form.salvage_value} 
                  onChange={(e) => setForm({...form, salvage_value: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Giá trị thanh lý còn lại..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Thời gian sử dụng (năm)</label>
                <input 
                  type="number" 
                  value={form.useful_life_years} 
                  onChange={(e) => setForm({...form, useful_life_years: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Ví dụ: 10 năm..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Ngày mua đưa vào dùng</label>
                <input 
                  type="date" 
                  value={form.purchase_date} 
                  onChange={(e) => setForm({...form, purchase_date: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Mô tả tài sản</label>
                <textarea 
                  rows={2}
                  value={form.description} 
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Hãng sản xuất, ghi chú bảo dưỡng, vị trí cụ thể..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded-lg transition"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={() => {
                  if (!form.asset_code || !form.name || !form.building_id || !form.purchase_cost || !form.purchase_date || !form.useful_life_years) {
                    return toast.error('Vui lòng điền đầy đủ các thông tin bắt buộc');
                  }
                  createMutation.mutate(form);
                }}
                className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition"
              >
                Lưu tài sản
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
