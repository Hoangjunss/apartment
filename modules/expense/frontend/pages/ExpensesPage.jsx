import { useState, useEffect } from 'react';
import { Plus, Eye, Edit, Trash2, Calendar, DollarSign, FileText, CheckCircle, Clock, X, AlertTriangle, ArrowRight, RefreshCw, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { DataTable } from '@/components/common/DataTable.jsx';
import { RoleGuard } from '@/components/common/RoleGuard.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useBuildings } from 'modules/building/frontend/hooks/useBuilding.js';
import { AttachmentsSection } from 'modules/attachments/frontend/components/AttachmentsSection.jsx';
import {
  useExpenses,
  useExpensesSummary,
  useCreateExpense,
  useUpdateExpense,
  useUpdateExpenseStatus,
  useDeleteExpense
} from '../hooks/useExpense.js';
import { useActiveBuilding } from '@/contexts/BuildingContext.jsx';

const formatCurrency = (v) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v));

export function ExpenseStatusBadge({ status }) {
  const config = {
    PENDING: { label: 'Chờ thanh toán', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    PAID: { label: 'Đã thanh toán', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  }[status] ?? { label: status, className: 'bg-gray-50 text-gray-700 border-gray-200' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.className}`}>
      {config.label}
    </span>
  );
}

export function ExpenseCategoryBadge({ category }) {
  const config = {
    OPERATIONS: { label: 'Vận hành', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    MAINTENANCE: { label: 'Bảo trì', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  }[category] ?? { label: category, className: 'bg-gray-50 text-gray-700 border-gray-200' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.className}`}>
      {config.label}
    </span>
  );
}

export default function ExpensesPage() {
  const { user } = useAuth();
  const { selectedBuildingId, setSelectedBuildingId } = useActiveBuilding();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    start_date: '',
    end_date: ''
  });

  // Modal States
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);

  // Form Fields State
  const [formFields, setFormFields] = useState({
    building_id: '',
    category: 'OPERATIONS',
    title: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    status: 'PENDING',
    description: ''
  });

  // Fetch Buildings for Filters and Form dropdown
  const { data: buildingsData } = useBuildings({ limit: 100 });
  const buildings = buildingsData?.items ?? [];

  // Params for fetching expenses
  const params = {
    page,
    limit: 20,
    building_id: selectedBuildingId !== 'all' ? Number(selectedBuildingId) : undefined,
    category: filters.category || undefined,
    status: filters.status || undefined,
    start_date: filters.start_date || undefined,
    end_date: filters.end_date || undefined
  };

  // Queries
  const { data, isLoading, refetch } = useExpenses(params);
  const expenses = data?.items ?? [];
  const total = data?.total ?? 0;

  const { data: summary } = useExpensesSummary({
    building_id: selectedBuildingId !== 'all' ? Number(selectedBuildingId) : undefined
  });

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  // Mutations
  const createExpenseMutation = useCreateExpense({
    onSuccess: (newExpense) => {
      toast.success('Ghi nhận chi phí thành công');
      setIsFormModalOpen(false);
      resetForm();
      refetch();
      setSelectedExpense(newExpense);
      setIsDetailModalOpen(true);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  });

  const updateExpenseMutation = useUpdateExpense({
    onSuccess: (updatedExpense) => {
      toast.success('Cập nhật chi phí thành công');
      setIsFormModalOpen(false);
      setEditData(null);
      resetForm();
      refetch();
      if (selectedExpense && selectedExpense.id === updatedExpense.id) {
        setSelectedExpense(updatedExpense);
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  });

  const updateStatusMutation = useUpdateExpenseStatus({
    onSuccess: (updated) => {
      toast.success('Đã cập nhật trạng thái thanh toán');
      refetch();
      if (selectedExpense && selectedExpense.id === updated.id) {
        setSelectedExpense({ ...selectedExpense, status: updated.status });
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  });

  const deleteExpenseMutation = useDeleteExpense({
    onSuccess: () => {
      toast.success('Đã xóa chi phí thành công');
      setIsDetailModalOpen(false);
      setSelectedExpense(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Xóa chi phí thất bại');
    }
  });

  // Handlers
  const handleOpenAdd = () => {
    setEditData(null);
    setFormFields({
      building_id: buildings[0]?.id ? String(buildings[0].id) : '',
      category: 'OPERATIONS',
      title: '',
      amount: '',
      expense_date: new Date().toISOString().split('T')[0],
      status: 'PENDING',
      description: ''
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (expense, e) => {
    e.stopPropagation();
    setEditData(expense);
    setFormFields({
      building_id: String(expense.building_id),
      category: expense.category,
      title: expense.title,
      amount: String(expense.amount),
      expense_date: new Date(expense.expense_date).toISOString().split('T')[0],
      status: expense.status,
      description: expense.description || ''
    });
    setIsFormModalOpen(true);
  };

  const handleOpenDetail = (expense) => {
    setSelectedExpense(expense);
    setIsDetailModalOpen(true);
  };

  const handleDeleteExpense = (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa chứng từ chi phí này không?')) {
      deleteExpenseMutation.mutate(id);
    }
  };

  const handleToggleStatus = (expense, e) => {
    if (e) e.stopPropagation();
    const newStatus = expense.status === 'PAID' ? 'PENDING' : 'PAID';
    updateStatusMutation.mutate({ id: expense.id, status: newStatus });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formFields.building_id || !formFields.title || !formFields.amount || !formFields.expense_date) {
      toast.error('Vui lòng nhập đủ các trường bắt buộc');
      return;
    }

    const payload = {
      building_id: Number(formFields.building_id),
      category: formFields.category,
      title: formFields.title,
      amount: Number(formFields.amount),
      expense_date: formFields.expense_date,
      status: formFields.status,
      description: formFields.description
    };

    if (editData) {
      updateExpenseMutation.mutate({ id: editData.id, ...payload });
    } else {
      createExpenseMutation.mutate(payload);
    }
  };

  const resetForm = () => {
    setFormFields({
      building_id: '',
      category: 'OPERATIONS',
      title: '',
      amount: '',
      expense_date: new Date().toISOString().split('T')[0],
      status: 'PENDING',
      description: ''
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      category: '',
      status: '',
      start_date: '',
      end_date: ''
    });
    setSelectedBuildingId('all');
  };

  const columns = [
    {
      key: 'expense_date',
      label: 'Ngày chi',
      render: (row) => <span className="font-semibold text-slate-700">{new Date(row.expense_date).toLocaleDateString('vi-VN')}</span>
    },
    {
      key: 'building',
      label: 'Tòa nhà',
      render: (row) => <span className="font-mono text-xs">{row.building?.name ?? '—'}</span>
    },
    {
      key: 'category',
      label: 'Danh mục',
      render: (row) => <ExpenseCategoryBadge category={row.category} />
    },
    {
      key: 'title',
      label: 'Nội dung chi',
      render: (row) => (
        <div className="max-w-[200px] truncate" title={row.title}>
          <span className="font-medium text-slate-800">{row.title}</span>
          {row.description && <p className="text-[10px] text-slate-400 truncate mt-0.5">{row.description}</p>}
        </div>
      )
    },
    {
      key: 'amount',
      label: 'Số tiền',
      render: (row) => <span className="font-bold text-slate-900">{formatCurrency(row.amount)}</span>
    },
    {
      key: 'attachment_count',
      label: 'Chứng từ',
      render: (row) => (
        <span 
          className="inline-flex items-center gap-1 text-slate-500 font-semibold text-xs bg-slate-50 border border-slate-100 rounded-full px-2.5 py-0.5" 
          title={`${row.attachment_count || 0} tệp chứng từ`}
        >
          <Paperclip size={12} className="text-slate-400" />
          {row.attachment_count || 0}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (row) => <ExpenseStatusBadge status={row.status} />
    },
    {
      key: 'actions',
      label: '',
      render: (row) => {
        const isAdmin = user?.role === 'ADMIN';
        return (
          <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => handleOpenDetail(row)}
              className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-50 transition-colors"
              title="Xem chi tiết & Đính kèm"
              id={`view-expense-${row.id}`}
            >
              <Eye size={16} />
            </button>
            <button
              onClick={(e) => handleOpenEdit(row, e)}
              className="p-1 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-50 transition-colors"
              title="Sửa chi phí"
              id={`edit-expense-${row.id}`}
            >
              <Edit size={16} />
            </button>
            {isAdmin && (
              <button
                onClick={() => handleDeleteExpense(row.id)}
                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-50 transition-colors"
                title="Xóa chi phí"
                id={`delete-expense-${row.id}`}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chi phí Tòa nhà"
        subtitle={`Quản lý và ghi nhận chi phí vận hành, bảo trì tòa nhà (${total} chứng từ)`}
        action={
          <button
            onClick={handleOpenAdd}
            className="btn-primary flex items-center gap-2"
            id="add-expense-btn"
          >
            <Plus size={16} />
            Ghi nhận chi phí
          </button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Tổng chi phí (Thanh toán)</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">
              {formatCurrency(summary?.totalAmount ?? 0)}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-100">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Chi vận hành (OPERATIONS)</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">
              {formatCurrency(summary?.byCategory?.OPERATIONS ?? 0)}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 border border-blue-100">
            <FileText size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Chi bảo trì (MAINTENANCE)</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">
              {formatCurrency(summary?.byCategory?.MAINTENANCE ?? 0)}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0 border border-purple-100">
            <RefreshCw size={20} />
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-50 pb-2">
          <h4 className="font-bold text-slate-700 flex items-center gap-1.5 text-sm">
            <Clock size={16} className="text-slate-400" />
            Bộ lọc nâng cao
          </h4>
          {(selectedBuildingId !== 'all' || filters.category || filters.status || filters.start_date || filters.end_date) && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
            >
              Đặt lại
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Tòa nhà</label>
            <select
              value={selectedBuildingId}
              onChange={(e) => {
                setSelectedBuildingId(e.target.value || 'all');
              }}
              className="input w-full text-xs"
              id="filter-building-select"
            >
              <option value="all">Tất cả tòa nhà</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Danh mục chi</label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="input w-full text-xs"
              id="filter-category-select"
            >
              <option value="">Tất cả danh mục</option>
              <option value="OPERATIONS">Vận hành (OPERATIONS)</option>
              <option value="MAINTENANCE">Bảo trì (MAINTENANCE)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Trạng thái thanh toán</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="input w-full text-xs"
              id="filter-status-select"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="PENDING">Chờ thanh toán</option>
              <option value="PAID">Đã thanh toán</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Từ ngày</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              className="input w-full text-xs"
              id="filter-start-date"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Đến ngày</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
              className="input w-full text-xs"
              id="filter-end-date"
            />
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <DataTable
        columns={columns}
        data={expenses}
        total={total}
        page={page}
        limit={20}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyMessage="Chưa có chứng từ chi phí nào được ghi nhận cho bộ lọc này."
      />

      {/* Detail & Attachments Modal */}
      {isDetailModalOpen && selectedExpense && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 shrink-0">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <FileText className="text-indigo-600" size={20} />
                Chi tiết Chi phí Tòa nhà
              </h3>
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedExpense(null);
                  refetch();
                }}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
                id="close-detail-modal-btn"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-5 gap-6">
              {/* Info Column */}
              <div className="md:col-span-2 space-y-5">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nội dung chi</span>
                    <h4 className="font-bold text-slate-800 text-base mt-0.5">{selectedExpense.title}</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Số tiền</span>
                      <p className="font-extrabold text-slate-900 text-lg mt-0.5">{formatCurrency(selectedExpense.amount)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ngày chi</span>
                      <p className="font-medium text-slate-700 text-sm mt-0.5">{new Date(selectedExpense.expense_date).toLocaleDateString('vi-VN')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tòa nhà</span>
                      <p className="font-medium text-slate-700 text-sm mt-0.5">{selectedExpense.building?.name ?? '—'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Danh mục</span>
                      <div className="mt-1">
                        <ExpenseCategoryBadge category={selectedExpense.category} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trạng thái</span>
                    <div className="flex items-center gap-2 mt-1.5">
                      <ExpenseStatusBadge status={selectedExpense.status} />
                      <button
                        onClick={(e) => handleToggleStatus(selectedExpense, e)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 ml-1"
                        id="toggle-detail-status-btn"
                      >
                        {selectedExpense.status === 'PAID' ? 'Đánh dấu Chưa trả' : 'Đánh dấu Đã trả'}
                      </button>
                    </div>
                  </div>

                  {selectedExpense.description && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mô tả</span>
                      <p className="text-xs text-slate-600 whitespace-pre-wrap mt-0.5">{selectedExpense.description}</p>
                    </div>
                  )}

                  <div className="border-t border-slate-200/50 pt-3">
                    <p className="text-[10px] text-slate-400">
                      Ghi nhận bởi: <span className="font-semibold text-slate-500">{selectedExpense.creator?.full_name}</span>
                    </p>
                    <p className="text-[9px] text-slate-400">
                      Vào ngày: {new Date(selectedExpense.created_at).toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Attachments Section Column */}
              <div className="md:col-span-3">
                <AttachmentsSection entityType="BuildingExpense" entityId={selectedExpense.id} />
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between shrink-0">
              {user?.role === 'ADMIN' ? (
                <button
                  onClick={() => handleDeleteExpense(selectedExpense.id)}
                  className="btn-danger flex items-center gap-1.5 py-2 text-xs"
                  id="delete-detail-expense-btn"
                >
                  <Trash2 size={13} /> Xóa chi phí
                </button>
              ) : <div />}

              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedExpense(null);
                  refetch();
                }}
                className="btn-secondary text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-lg">
                {editData ? 'Sửa Chi phí Tòa nhà' : 'Ghi nhận Chi phí Tòa nhà'}
              </h3>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
                id="close-form-modal-btn"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Tòa nhà <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formFields.building_id}
                    onChange={(e) => setFormFields({ ...formFields, building_id: e.target.value })}
                    className="input w-full text-sm"
                    required
                  >
                    <option value="" disabled>Chọn tòa nhà</option>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Danh mục <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formFields.category}
                    onChange={(e) => setFormFields({ ...formFields, category: e.target.value })}
                    className="input w-full text-sm"
                    required
                  >
                    <option value="OPERATIONS">Vận hành (OPERATIONS)</option>
                    <option value="MAINTENANCE">Bảo trì (MAINTENANCE)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Nội dung chi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Tiền điện công cộng tòa nhà tháng 5"
                  value={formFields.title}
                  onChange={(e) => setFormFields({ ...formFields, title: e.target.value })}
                  className="input w-full text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Số tiền (VND) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="Nhập số tiền chi"
                    value={formFields.amount}
                    onChange={(e) => setFormFields({ ...formFields, amount: e.target.value })}
                    className="input w-full text-sm"
                    required
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Ngày chi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formFields.expense_date}
                    onChange={(e) => setFormFields({ ...formFields, expense_date: e.target.value })}
                    className="input w-full text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Trạng thái thanh toán
                  </label>
                  <select
                    value={formFields.status}
                    onChange={(e) => setFormFields({ ...formFields, status: e.target.value })}
                    className="input w-full text-sm"
                  >
                    <option value="PENDING">Chờ thanh toán</option>
                    <option value="PAID">Đã thanh toán</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Mô tả chi tiết
                </label>
                <textarea
                  placeholder="Ghi chú chi tiết về khoản chi này..."
                  value={formFields.description}
                  onChange={(e) => setFormFields({ ...formFields, description: e.target.value })}
                  className="input w-full text-sm h-20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="btn-secondary py-2 px-4 text-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending}
                  className="btn-primary py-2 px-4 text-sm flex items-center gap-1"
                  id="submit-expense-form-btn"
                >
                  {createExpenseMutation.isPending || updateExpenseMutation.isPending ? (
                    'Đang lưu...'
                  ) : (
                    'Lưu chi phí'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
