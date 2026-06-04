import { useState, useCallback } from 'react';
import { 
  Warehouse, 
  Package, 
  Plus, 
  Search, 
  ArrowUpDown, 
  AlertTriangle, 
  Layers, 
  Boxes, 
  History,
  TrendingDown,
  TrendingUp,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { DataTable } from '@/components/common/DataTable.jsx';
import { RoleGuard } from '@/components/common/RoleGuard.jsx';
import { ROLES } from '@/constants/roles.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import toast from 'react-hot-toast';

import { 
  useWarehouses, 
  useCreateWarehouse, 
  useInventoryItems, 
  useCreateInventoryItem, 
  useUpdateInventoryItem,
  useStockTransactions, 
  useRecordStockTransaction 
} from '../hooks/useInventory.js';
import { useBuildings } from 'modules/building/frontend/hooks/useBuilding.js';

export default function InventoryDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('items'); // items, warehouses, transactions
  
  // Search & Filter states
  const [itemSearch, setItemSearch] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [itemWarehouse, setItemWarehouse] = useState('');
  const [whSearch, setWhSearch] = useState('');
  
  // Pagination states
  const [itemsPage, setItemsPage] = useState(1);
  const [whPage, setWhPage] = useState(1);
  const [txPage, setTxPage] = useState(1);

  // Modals state
  const [isWhModalOpen, setIsWhModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [txTargetItem, setTxTargetItem] = useState(null);

  // Form states
  const [whForm, setWhForm] = useState({ name: '', building_id: '', description: '' });
  const [itemForm, setItemForm] = useState({ item_name: '', warehouse_id: '', category: 'CONSUMABLE', min_stock_level: 0, current_stock: 0, unit: '', unit_cost: '' });
  const [txForm, setTxForm] = useState({ type: 'STOCK_IN', quantity: '', note: '' });

  // Fetch API Queries
  const { data: whData, isLoading: isWhLoading } = useWarehouses({ search: whSearch, page: whPage, limit: 10 });
  const { data: itemsData, isLoading: isItemsLoading } = useInventoryItems({ 
    search: itemSearch, 
    category: itemCategory, 
    warehouse_id: itemWarehouse, 
    page: itemsPage, 
    limit: 10 
  });
  const { data: txData, isLoading: isTxLoading } = useStockTransactions({ page: txPage, limit: 10 });
  
  // Fetch Buildings list for Dropdown selection
  const { data: buildingsData } = useBuildings({ limit: 100 });
  const buildings = buildingsData?.items ?? [];

  // Mutations
  const createWhMutation = useCreateWarehouse({
    onSuccess: () => {
      toast.success('Đã thêm kho mới thành công');
      setIsWhModalOpen(false);
      setWhForm({ name: '', building_id: '', description: '' });
    },
    onError: (err) => toast.error(err.message || 'Lỗi khi tạo kho')
  });

  const createItemMutation = useCreateInventoryItem({
    onSuccess: () => {
      toast.success('Đã thêm vật tư mới thành công');
      setIsItemModalOpen(false);
      setItemForm({ item_name: '', warehouse_id: '', category: 'CONSUMABLE', min_stock_level: 0, current_stock: 0, unit: '', unit_cost: '' });
    },
    onError: (err) => toast.error(err.message || 'Lỗi khi thêm vật tư')
  });

  const updateItemMutation = useUpdateInventoryItem(editingItem?.id, {
    onSuccess: () => {
      toast.success('Cập nhật thông tin vật tư thành công');
      setIsItemModalOpen(false);
      setEditingItem(null);
      setItemForm({ item_name: '', warehouse_id: '', category: 'CONSUMABLE', min_stock_level: 0, current_stock: 0, unit: '', unit_cost: '' });
    },
    onError: (err) => toast.error(err.message || 'Lỗi khi cập nhật')
  });

  const recordTxMutation = useRecordStockTransaction({
    onSuccess: () => {
      toast.success('Ghi nhận giao dịch kho thành công');
      setIsTxModalOpen(false);
      setTxTargetItem(null);
      setTxForm({ type: 'STOCK_IN', quantity: '', note: '' });
    },
    onError: (err) => toast.error(err.message || 'Lỗi giao dịch kho')
  });

  // Derived low stock warning data
  const lowStockItems = itemsData?.items?.filter(item => item.current_stock <= item.min_stock_level) ?? [];

  // Columns configurations
  const warehouseColumns = [
    { key: 'id', label: 'ID', width: '60px' },
    { key: 'name', label: 'Tên kho', render: (row) => <span className="font-semibold text-gray-900">{row.name}</span> },
    { key: 'building', label: 'Tòa nhà', render: (row) => <span>{row.building?.name} ({row.building?.code})</span> },
    { key: 'description', label: 'Mô tả' }
  ];

  const itemColumns = [
    { key: 'id', label: 'ID', width: '60px' },
    { key: 'item_name', label: 'Tên vật tư', render: (row) => <span className="font-semibold text-gray-900">{row.item_name}</span> },
    { key: 'warehouse', label: 'Kho hàng', render: (row) => <span>{row.warehouse?.name}</span> },
    { key: 'category', label: 'Phân loại', render: (row) => {
        const cats = { CONSUMABLE: 'Tiêu hao', SPARE_PART: 'Phụ tùng', TOOL: 'Công cụ', EQUIPMENT: 'Thiết bị' };
        return <span className="px-2.5 py-1 text-xs rounded-full bg-slate-100 text-slate-700 font-medium">{cats[row.category] || row.category}</span>;
      }
    },
    { key: 'current_stock', label: 'Tồn kho thực tế', width: '150px', render: (row) => {
        const isLow = row.current_stock <= row.min_stock_level;
        return (
          <div className="flex items-center gap-1.5">
            <span className={`font-bold ${isLow ? 'text-rose-600 animate-pulse' : 'text-emerald-600'}`}>
              {row.current_stock}
            </span>
            <span className="text-gray-400 text-xs">/ tối thiểu {row.min_stock_level} {row.unit}</span>
          </div>
        );
      }
    },
    { key: 'unit_cost', label: 'Đơn giá định mức', render: (row) => `${Number(row.unit_cost).toLocaleString('vi-VN')} đ` },
    { key: 'actions', label: '', width: '180px', render: (row) => (
        <div className="flex gap-2">
          <button 
            onClick={() => {
              setTxTargetItem(row);
              setIsTxModalOpen(true);
            }}
            className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition font-medium flex items-center gap-1"
          >
            <ArrowUpDown size={12} /> Nhập/Xuất
          </button>
          <RoleGuard roles={ROLES.ADMIN}>
            <button 
              onClick={() => {
                setEditingItem(row);
                setItemForm({
                  item_name: row.item_name,
                  warehouse_id: row.warehouse_id,
                  category: row.category,
                  min_stock_level: row.min_stock_level,
                  current_stock: row.current_stock,
                  unit: row.unit,
                  unit_cost: row.unit_cost
                });
                setIsItemModalOpen(true);
              }}
              className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
            >
              Sửa
            </button>
          </RoleGuard>
        </div>
      )
    }
  ];

  const transactionColumns = [
    { key: 'created_at', label: 'Thời gian', width: '160px', render: (row) => new Date(row.created_at).toLocaleString('vi-VN') },
    { key: 'item_name', label: 'Vật tư', render: (row) => (
        <div>
          <p className="font-semibold text-gray-900">{row.item_name_snapshot}</p>
          <p className="text-xs text-gray-400">ID: {row.inventory_item_id}</p>
        </div>
      )
    },
    { key: 'type', label: 'Loại Giao Dịch', render: (row) => {
        const isOut = row.type === 'STOCK_OUT';
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${isOut ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {isOut ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
            {isOut ? 'XUẤT KHO' : 'NHẬP KHO'}
          </span>
        );
      }
    },
    { key: 'quantity', label: 'Số lượng', render: (row) => <span className="font-semibold text-gray-900">{row.type === 'STOCK_OUT' ? '-' : '+'}{row.quantity} {row.inventory_item?.unit}</span> },
    { key: 'unit_cost', label: 'Giá snapshot', render: (row) => `${Number(row.unit_cost).toLocaleString('vi-VN')} đ` },
    { key: 'ref', label: 'Chứng từ tham chiếu', render: (row) => {
        if (!row.ref_type || row.ref_type === 'MANUAL') return <span className="text-gray-400 text-xs">Thủ công</span>;
        return (
          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
            Sự cố #{row.ref_id}
          </span>
        );
      }
    },
    { key: 'recorded_by', label: 'Người thực hiện', render: (row) => <span>{row.recorder?.full_name} ({row.recorder?.role})</span> },
    { key: 'note', label: 'Ghi chú', render: (row) => <span className="text-gray-500 text-xs italic">{row.note || '-'}</span> }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Quản lý Kho vận hành" 
        subtitle="Quản lý kho vật tư tiêu hao, thiết bị và công cụ thay thế"
        action={
          <div className="flex gap-2">
            <button 
              onClick={() => setIsWhModalOpen(true)}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition flex items-center gap-2 text-sm font-semibold shadow-sm"
            >
              <Warehouse size={16} /> Thêm kho mới
            </button>
            <button 
              onClick={() => setIsItemModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 text-sm font-semibold shadow-sm"
            >
              <Plus size={16} /> Khai báo vật tư
            </button>
          </div>
        }
      />

      {/* Low Stock Warning Section */}
      {lowStockItems.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm animate-[fadeIn_0.5s_ease-out]">
          <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="text-rose-600" size={20} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-rose-950 flex items-center gap-2">
              Cảnh báo: Phát hiện {lowStockItems.length} vật tư dưới ngưỡng tồn kho an toàn!
            </h4>
            <div className="flex flex-wrap gap-2 mt-2">
              {lowStockItems.map(item => (
                <span key={item.id} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white border border-rose-100 shadow-sm text-rose-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  {item.item_name}: Tồn {item.current_stock} (Tối thiểu {item.min_stock_level} {item.unit})
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs list with premium styling */}
      <div className="flex border-b border-gray-200 gap-6">
        <button 
          onClick={() => setActiveTab('items')}
          className={`pb-4 px-2 text-sm font-semibold flex items-center gap-2 transition ${activeTab === 'items' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
        >
          <Boxes size={16} /> Vật tư tiêu hao ({itemsData?.total ?? 0})
        </button>
        <button 
          onClick={() => setActiveTab('warehouses')}
          className={`pb-4 px-2 text-sm font-semibold flex items-center gap-2 transition ${activeTab === 'warehouses' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
        >
          <Warehouse size={16} /> Danh sách Kho ({whData?.total ?? 0})
        </button>
        <button 
          onClick={() => setActiveTab('transactions')}
          className={`pb-4 px-2 text-sm font-semibold flex items-center gap-2 transition ${activeTab === 'transactions' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
        >
          <History size={16} /> Nhật ký nhập xuất ({txData?.total ?? 0})
        </button>
      </div>

      {/* TAB CONTENTS */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Tìm vật tư..." 
                value={itemSearch}
                onChange={(e) => { setItemSearch(e.target.value); setItemsPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <select 
                value={itemCategory}
                onChange={(e) => { setItemCategory(e.target.value); setItemsPage(1); }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">Tất cả phân loại</option>
                <option value="CONSUMABLE">Vật tư tiêu hao</option>
                <option value="SPARE_PART">Phụ tùng thay thế</option>
                <option value="TOOL">Công cụ & dụng cụ</option>
                <option value="EQUIPMENT">Thiết bị</option>
              </select>
            </div>
            <div>
              <select 
                value={itemWarehouse}
                onChange={(e) => { setItemWarehouse(e.target.value); setItemsPage(1); }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">Tất cả các Kho</option>
                {whData?.items?.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

          <DataTable 
            columns={itemColumns}
            data={itemsData?.items ?? []}
            total={itemsData?.total ?? 0}
            page={itemsPage}
            onPageChange={setItemsPage}
            isLoading={isItemsLoading}
            emptyMessage="Không tìm thấy vật tư nào"
          />
        </div>
      )}

      {activeTab === 'warehouses' && (
        <div className="space-y-4">
          <div className="max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Tìm kho..." 
                value={whSearch}
                onChange={(e) => { setWhSearch(e.target.value); setWhPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <DataTable 
            columns={warehouseColumns}
            data={whData?.items ?? []}
            total={whData?.total ?? 0}
            page={whPage}
            onPageChange={setWhPage}
            isLoading={isWhLoading}
            emptyMessage="Không tìm thấy kho hàng nào"
          />
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <DataTable 
            columns={transactionColumns}
            data={txData?.items ?? []}
            total={txData?.total ?? 0}
            page={txPage}
            onPageChange={setTxPage}
            isLoading={isTxLoading}
            emptyMessage="Không tìm thấy lịch sử nhập xuất nào"
          />
        </div>
      )}

      {/* MODAL WAREHOUSE FORM */}
      {isWhModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 relative border border-gray-100">
            <button 
              onClick={() => setIsWhModalOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-900 transition"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-gray-950 flex items-center gap-2">
              <Warehouse size={18} className="text-blue-600" /> Thêm kho vật tư mới
            </h3>
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Tên kho</label>
                <input 
                  type="text" 
                  value={whForm.name} 
                  onChange={(e) => setWhForm({...whForm, name: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Ví dụ: Kho kỹ thuật block A"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Thuộc Tòa nhà</label>
                <select 
                  value={whForm.building_id} 
                  onChange={(e) => setWhForm({...whForm, building_id: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Chọn tòa nhà...</option>
                  {buildings.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Mô tả</label>
                <textarea 
                  rows={3}
                  value={whForm.description} 
                  onChange={(e) => setWhForm({...whForm, description: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Thông tin thêm về vị trí hoặc trách nhiệm kho..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button 
                onClick={() => setIsWhModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded-lg transition"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={() => {
                  if (!whForm.name || !whForm.building_id) return toast.error('Vui lòng điền đủ các trường bắt buộc');
                  createWhMutation.mutate(whForm);
                }}
                disabled={createWhMutation.isPending}
                className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition"
              >
                Lưu kho hàng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INVENTORY ITEM FORM */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 relative border border-gray-100">
            <button 
              onClick={() => {
                setIsItemModalOpen(false);
                setEditingItem(null);
              }}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-900 transition"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-gray-950 flex items-center gap-2">
              <Package size={18} className="text-blue-600" /> {editingItem ? 'Sửa thông tin vật tư' : 'Khai báo thông số vật tư'}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Tên vật tư</label>
                <input 
                  type="text" 
                  value={itemForm.item_name} 
                  onChange={(e) => setItemForm({...itemForm, item_name: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Ví dụ: Bóng đèn Philips LED 12W"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Kho lưu trữ</label>
                <select 
                  value={itemForm.warehouse_id} 
                  onChange={(e) => setItemForm({...itemForm, warehouse_id: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500"
                  disabled={!!editingItem} // edit item shouldn't change warehouse easily
                >
                  <option value="">Chọn kho...</option>
                  {whData?.items?.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Phân loại</label>
                <select 
                  value={itemForm.category} 
                  onChange={(e) => setItemForm({...itemForm, category: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="CONSUMABLE">Vật tư tiêu hao</option>
                  <option value="SPARE_PART">Phụ tùng thay thế</option>
                  <option value="TOOL">Công cụ & dụng cụ</option>
                  <option value="EQUIPMENT">Thiết bị</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Đơn vị tính</label>
                <input 
                  type="text" 
                  value={itemForm.unit} 
                  onChange={(e) => setItemForm({...itemForm, unit: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Ví dụ: cái, mét, chai..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Đơn giá định mức</label>
                <input 
                  type="number" 
                  value={itemForm.unit_cost} 
                  onChange={(e) => setItemForm({...itemForm, unit_cost: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Giá nhập gần nhất..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Tồn an toàn tối thiểu</label>
                <input 
                  type="number" 
                  value={itemForm.min_stock_level} 
                  onChange={(e) => setItemForm({...itemForm, min_stock_level: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Số lượng tối thiểu cảnh báo..."
                />
              </div>
              {!editingItem && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Số lượng nhập ban đầu</label>
                  <input 
                    type="number" 
                    value={itemForm.current_stock} 
                    onChange={(e) => setItemForm({...itemForm, current_stock: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Số lượng thực tế nhập ban đầu..."
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button 
                onClick={() => {
                  setIsItemModalOpen(false);
                  setEditingItem(null);
                }}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded-lg transition"
              >
                Hủy
              </button>
              <button 
                onClick={() => {
                  if (!itemForm.item_name || !itemForm.warehouse_id || !itemForm.unit || !itemForm.unit_cost) {
                    return toast.error('Vui lòng điền đủ các trường bắt buộc');
                  }
                  if (editingItem) {
                    updateItemMutation.mutate(itemForm);
                  } else {
                    createItemMutation.mutate(itemForm);
                  }
                }}
                className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition"
              >
                Lưu vật tư
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL STOCK TRANSACTION (QUICK IN/OUT) */}
      {isTxModalOpen && txTargetItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 relative border border-gray-100">
            <button 
              onClick={() => {
                setIsTxModalOpen(false);
                setTxTargetItem(null);
              }}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-900 transition"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-gray-950 flex flex-col">
              <span>Giao dịch Nhập/Xuất kho vật tư</span>
              <span className="text-sm font-normal text-gray-500 mt-1">Vật tư: {txTargetItem.item_name} (Hiện tồn: {txTargetItem.current_stock} {txTargetItem.unit})</span>
            </h3>
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Loại giao dịch</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setTxForm({...txForm, type: 'STOCK_IN'})}
                    className={`py-2 text-sm font-bold rounded-lg border transition ${txForm.type === 'STOCK_IN' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    NHẬP KHO (+)
                  </button>
                  <button 
                    onClick={() => setTxForm({...txForm, type: 'STOCK_OUT'})}
                    className={`py-2 text-sm font-bold rounded-lg border transition ${txForm.type === 'STOCK_OUT' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    XUẤT KHO (-)
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Số lượng ({txTargetItem.unit})</label>
                <input 
                  type="number" 
                  value={txForm.quantity} 
                  onChange={(e) => setTxForm({...txForm, quantity: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Số lượng thực hiện..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Ghi chú / Lý do</label>
                <textarea 
                  rows={2}
                  value={txForm.note} 
                  onChange={(e) => setTxForm({...txForm, note: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Lý do nhập/xuất hoặc thông tin chứng từ..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button 
                onClick={() => {
                  setIsTxModalOpen(false);
                  setTxTargetItem(null);
                }}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded-lg transition"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={() => {
                  if (!txForm.quantity || Number(txForm.quantity) <= 0) return toast.error('Vui lòng nhập số lượng hợp lệ');
                  if (txForm.type === 'STOCK_OUT' && Number(txForm.quantity) > txTargetItem.current_stock) {
                    return toast.error('Số lượng tồn kho không đủ để xuất');
                  }
                  recordTxMutation.mutate({
                    inventory_item_id: txTargetItem.id,
                    type: txForm.type,
                    quantity: Number(txForm.quantity),
                    ref_type: 'MANUAL',
                    note: txForm.note
                  });
                }}
                disabled={recordTxMutation.isPending}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition ${txForm.type === 'STOCK_OUT' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              >
                Ghi nhận giao dịch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
