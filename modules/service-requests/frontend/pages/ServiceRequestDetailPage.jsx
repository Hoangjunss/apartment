// modules/service-requests/frontend/pages/ServiceRequestDetailPage.jsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Home, Clock, Package } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { LoadingSpinner } from '@/components/common/LoadingSpinner.jsx';
import { EmptyState } from '@/components/common/EmptyState.jsx';
import { RoleGuard } from '@/components/common/RoleGuard.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { MANAGEMENT_ROLES } from '@/constants/roles.js';
import { useServiceRequestById, useUpdateServiceRequestStatus } from '../hooks/useServiceRequests.js';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { CommentsSection } from 'modules/comments/frontend/components/CommentsSection.jsx';
import { AttachmentsSection } from 'modules/attachments/frontend/components/AttachmentsSection.jsx';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios.js';

const STATUS_LABELS = {
  PENDING: { label: 'Chờ xử lý', color: 'bg-amber-100 text-amber-700' },
  ASSIGNED: { label: 'Đã phân công', color: 'bg-indigo-100 text-indigo-700' },
  IN_PROGRESS: { label: 'Đang xử lý', color: 'bg-blue-100 text-blue-700' },
  RESOLVED: { label: 'Đã xong', color: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: 'Đã hủy', color: 'bg-rose-100 text-rose-700' },
  POSTPONED: { label: 'Tạm hoãn', color: 'bg-slate-200 text-slate-700' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_LABELS[status] ?? { label: status, color: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

export default function ServiceRequestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: req, isLoading } = useServiceRequestById(Number(id));

  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [modalExpenses, setModalExpenses] = useState([{ description: '', amount: '' }]);
  const [modalMaterials, setModalMaterials] = useState([{ inventory_item_id: '', quantity: '' }]);
  const [pendingStatus, setPendingStatus] = useState(null);

  const { data: inventoryData } = useQuery({
    queryKey: ['inventoryItems', 'simple'],
    queryFn: () => api.get('/inventory/items').then(r => r.data.data?.items ?? r.data.data ?? []),
    enabled: isResolveModalOpen
  });
  const inventoryItems = Array.isArray(inventoryData) ? inventoryData : [];

  const { mutate: updateStatus, isPending: updatingStatus } = useUpdateServiceRequestStatus({
    onSuccess: () => {
      toast.success('Cập nhật thành công!');
      setIsResolveModalOpen(false);
      setPendingStatus(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Thực hiện thất bại');
      setPendingStatus(null);
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (!req) return <EmptyState message="Không tìm thấy yêu cầu kỹ thuật" />;

  const canUpdateStatus =
    MANAGEMENT_ROLES.includes(user?.role) ||
    (user?.role === 'TECHNICIAN' && req.assigned_to === user?.id);

  const handleStatusChange = (newStatus) => {
    if (newStatus === 'RESOLVED') {
      const existing = (req.expenses || []).map((e) => ({
        description: e.description,
        amount: e.amount.toString(),
      }));
      setModalExpenses(existing.length > 0 ? existing : [{ description: '', amount: '' }]);
      setPendingStatus('RESOLVED');
      setIsResolveModalOpen(true);
    } else {
      updateStatus({ id: req.id, status: newStatus });
    }
  };

  const handleEditExpensesClick = () => {
    const existing = (req.expenses || []).map((e) => ({
      description: e.description,
      amount: e.amount.toString(),
    }));
    setModalExpenses(existing.length > 0 ? existing : [{ description: '', amount: '' }]);
    setPendingStatus(null);
    setIsResolveModalOpen(true);
  };

  const handleAddExpenseRow = () => {
    setModalExpenses([...modalExpenses, { description: '', amount: '' }]);
  };

  const handleRemoveExpenseRow = (index) => {
    setModalExpenses(modalExpenses.filter((_, idx) => idx !== index));
  };

  const handleExpenseChange = (index, field, value) => {
    const next = [...modalExpenses];
    next[index][field] = value;
    setModalExpenses(next);
  };

  const handleAddMaterialRow = () => {
    setModalMaterials([...modalMaterials, { inventory_item_id: '', quantity: '' }]);
  };

  const handleRemoveMaterialRow = (index) => {
    setModalMaterials(modalMaterials.filter((_, idx) => idx !== index));
  };

  const handleMaterialChange = (index, field, value) => {
    const next = [...modalMaterials];
    next[index][field] = value;
    setModalMaterials(next);
  };

  const handleSaveExpenses = () => {
    const validExpenses = modalExpenses
      .filter((exp) => exp.description.trim() && exp.amount !== '')
      .map((exp) => ({
        description: exp.description.trim(),
        amount: Number(exp.amount),
      }));

    const validMaterials = modalMaterials
      .filter((mat) => mat.inventory_item_id && mat.quantity !== '')
      .map((mat) => ({
        inventory_item_id: Number(mat.inventory_item_id),
        quantity: Number(mat.quantity)
      }));

    updateStatus({
      id: req.id,
      status: pendingStatus || req.status,
      expenses: validExpenses,
      materials: validMaterials
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/service-requests')} className="btn-ghost p-2">
          <ArrowLeft size={18} />
        </button>
        <span className="text-sm font-medium text-slate-500">Quay lại danh sách</span>
      </div>

      <PageHeader
        title={req.title}
        subtitle={`Yêu cầu #${req.id} · Tạo lúc ${req.created_at ? format(parseISO(req.created_at), 'HH:mm dd/MM/yyyy') : ''}`}
        action={
          <div className="flex items-center gap-3">
            <StatusBadge status={req.status} />
            {canUpdateStatus && (
              <select
                value={req.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={updatingStatus}
                className="text-xs font-semibold rounded-lg border border-slate-200 p-2.5 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                id="change-status-select"
              >
                <option value="PENDING">Chờ xử lý</option>
                <option value="ASSIGNED">Đã phân công</option>
                <option value="IN_PROGRESS">Đang xử lý</option>
                <option value="RESOLVED">Đã xong</option>
                <option value="POSTPONED">Tạm hoãn</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5 space-y-4 bg-white">
            <div>
              <p className="info-label">Mô tả chi tiết</p>
              <p className="text-sm text-slate-700 mt-2 leading-relaxed whitespace-pre-wrap">{req.description}</p>
            </div>
          </div>

          {/* Apartment info */}
          {req.apartment && (
            <div className="card p-5 bg-white space-y-2">
              <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Home size={15} className="text-blue-500" />
                Căn hộ liên quan
              </p>
              <div className="flex items-center gap-3">
                <span className="font-mono font-semibold text-indigo-600">{req.apartment.apartment_code}</span>
                <span className="text-slate-400">·</span>
                <span className="text-sm text-slate-600">
                  {req.apartment.floor?.building?.name} / Tầng {req.apartment.floor?.floor_number}
                </span>
              </div>
            </div>
          )}

          {/* Asset info */}
          {req.asset && (
            <div className="card p-5 bg-white space-y-2">
              <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Package size={15} className="text-blue-500" />
                Tài sản liên quan
              </p>
              <div className="flex items-center gap-3">
                <span className="font-mono font-semibold text-indigo-600">{req.asset.asset_code}</span>
                <span className="text-slate-400">·</span>
                <span className="text-sm text-slate-600">
                  {req.asset.name}
                </span>
                <button 
                  onClick={() => navigate(`/assets/${req.asset.id}`)}
                  className="text-xs text-blue-600 hover:underline font-semibold"
                >
                  Xem chi tiết tài sản
                </button>
              </div>
            </div>
          )}

          {/* Detailed Expenses Card */}
          {(canUpdateStatus || (req.expenses && req.expenses.length > 0)) && (
            <div className="card p-5 bg-white space-y-3">
              <div className="flex justify-between items-center border-b pb-2">
                <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <span className="text-emerald-500">💰</span>
                  Chi phí sửa chữa / vật tư chi tiết
                </p>
                {canUpdateStatus && (
                  <button
                    onClick={handleEditExpensesClick}
                    className="text-xs text-blue-600 hover:underline font-medium"
                    id="edit-expenses-btn"
                  >
                    {req.expenses && req.expenses.length > 0 ? 'Chỉnh sửa chi phí' : 'Ghi nhận chi phí'}
                  </button>
                )}
              </div>

              {req.expenses && req.expenses.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-slate-600 border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                        <th className="py-2 px-3">Khoản mục</th>
                        <th className="py-2 px-3 text-right">Số tiền (VND)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {req.expenses.map((exp) => (
                        <tr key={exp.id}>
                          <td className="py-2.5 px-3 font-medium text-slate-800">{exp.description}</td>
                          <td className="py-2.5 px-3 text-right text-slate-800 font-mono">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(exp.amount))}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-bold border-t border-slate-200">
                        <td className="py-2.5 px-3 text-slate-800">Tổng cộng chi phí</td>
                        <td className="py-2.5 px-3 text-right text-emerald-600 font-mono">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                            req.expenses.reduce((sum, exp) => sum + Number(exp.amount), 0)
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Không ghi nhận chi phí nào phát sinh.</p>
              )}

              {req.materials_used && req.materials_used.length > 0 && (
                <div className="mt-4 pt-3 border-t">
                  <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
                    <Package size={12} className="text-blue-500" />
                    Vật tư sử dụng xuất từ Kho:
                  </p>
                  <div className="space-y-1.5">
                    {req.materials_used.map((mat) => (
                      <div key={mat.id} className="text-xs text-slate-600 flex justify-between bg-slate-50 p-2 rounded-lg border border-slate-100 items-center">
                        <span className="font-medium">{mat.inventory_item?.item_name}</span>
                        <div className="space-x-3">
                          <span className="text-slate-500">Số lượng: <span className="font-bold text-slate-800">{mat.quantity} {mat.inventory_item?.unit}</span></span>
                          <span className="text-gray-400">|</span>
                          <span className="text-slate-500">Đơn giá: <span className="font-mono text-slate-700">{Number(mat.unit_cost).toLocaleString('vi-VN')} đ</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Comments section */}
          <CommentsSection serviceRequestId={req.id} />
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          <div className="card p-5 bg-white space-y-4">
            <div>
              <p className="info-label flex items-center gap-1"><User size={12} />Người yêu cầu</p>
              <p className="text-sm font-semibold text-slate-800 mt-1">{req.requester_name ?? '—'}</p>
              {req.requester_phone && <p className="text-xs text-slate-500 font-mono mt-0.5">{req.requester_phone}</p>}
              <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">
                Nguồn: {req.source === 'PUBLIC_FORM' ? 'Khách thuê (QR)' : 'Nội bộ (Nhân viên)'}
              </p>
            </div>
            <div>
              <p className="info-label flex items-center gap-1"><User size={12} />Được phân công cho</p>
              {req.assignee ? (
                <>
                  <p className="text-sm font-medium text-slate-800 mt-1">{req.assignee.full_name}</p>
                  <p className="text-xs text-slate-400">{req.assignee.role}</p>
                </>
              ) : (
                <p className="text-sm text-slate-400 mt-1">Chưa phân công</p>
              )}
            </div>
            <div>
              <p className="info-label flex items-center gap-1"><Clock size={12} />Ngày tạo</p>
              <p className="text-sm text-slate-800 mt-1">
                {req.created_at ? format(parseISO(req.created_at), 'dd/MM/yyyy HH:mm') : '—'}
              </p>
            </div>
            <div>
              <p className="info-label flex items-center gap-1"><Clock size={12} />Cập nhật lần cuối</p>
              <p className="text-sm text-slate-800 mt-1">
                {req.updated_at ? format(parseISO(req.updated_at), 'dd/MM/yyyy HH:mm') : '—'}
              </p>
            </div>
          </div>

          {/* Attachments section */}
          <AttachmentsSection entityType="ServiceRequest" entityId={req.id} />
        </div>
      </div>

      {/* Expenses Modal when resolving */}
      {isResolveModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-800 border-b pb-2">
              {pendingStatus === 'RESOLVED' ? 'Hoàn thành sự cố & Ghi nhận chi phí' : 'Ghi nhận chi phí vật tư / sửa chữa'}
            </h3>

            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Liệt kê chi tiết các khoản chi phí phát sinh thực tế (ví dụ: linh kiện thay thế, công thợ, vật tư khác). Bỏ trống nếu không có chi phí.
              </p>

              <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                {modalExpenses.map((exp, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Mô tả khoản chi (VD: Đầu chia nước)"
                      value={exp.description}
                      onChange={(e) => handleExpenseChange(index, 'description', e.target.value)}
                      className="flex-1 p-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Số tiền (VND)"
                      value={exp.amount}
                      onChange={(e) => handleExpenseChange(index, 'amount', e.target.value)}
                      className="w-32 p-2 border border-slate-200 rounded-lg text-xs text-right focus:ring-1 focus:ring-indigo-500 outline-none"
                      required
                    />
                    {modalExpenses.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveExpenseRow(index)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg shrink-0 transition-colors text-xs font-semibold"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddExpenseRow}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                + Thêm dòng chi phí
              </button>

              <div className="border-t pt-3 flex justify-between items-center text-xs font-bold text-slate-700">
                <span>Tổng chi phí sửa chữa:</span>
                <span className="text-base text-emerald-600 font-mono">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                    modalExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0)
                  )}
                </span>
              </div>
              {/* Materials Used Selection */}
              {pendingStatus === 'RESOLVED' && (
                <div className="border-t pt-3 space-y-3">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Khai báo vật tư sử dụng từ Kho</label>
                  <p className="text-xs text-slate-500">Vật tư sẽ được tự động trừ tồn kho khi sự cố kỹ thuật này chuyển sang hoàn thành.</p>
                  
                  <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
                    {modalMaterials.map((mat, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <select
                          value={mat.inventory_item_id}
                          onChange={(e) => handleMaterialChange(index, 'inventory_item_id', e.target.value)}
                          className="flex-1 p-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
                        >
                          <option value="">Chọn vật tư...</option>
                          {inventoryItems.map(item => (
                            <option key={item.id} value={item.id} disabled={item.current_stock <= 0}>
                              {item.item_name} ({item.current_stock} {item.unit} trong kho)
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          placeholder="SL dùng"
                          value={mat.quantity}
                          onChange={(e) => handleMaterialChange(index, 'quantity', e.target.value)}
                          className="w-20 p-2 border border-slate-200 rounded-lg text-xs text-right focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                        {modalMaterials.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMaterialRow(index)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg shrink-0 transition-colors text-xs font-semibold"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleAddMaterialRow}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    + Thêm vật tư sử dụng
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => {
                  setIsResolveModalOpen(false);
                  setPendingStatus(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                disabled={updatingStatus}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveExpenses}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
                disabled={updatingStatus}
              >
                {updatingStatus ? 'Đang lưu...' : (pendingStatus === 'RESOLVED' ? 'Xác nhận & Hoàn thành' : 'Lưu chi phí')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
