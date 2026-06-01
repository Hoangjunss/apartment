import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Receipt, CheckCircle, AlertTriangle, Search, RotateCcw } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { DataTable } from '@/components/common/DataTable.jsx';
import { RoleGuard } from '@/components/common/RoleGuard.jsx';
import { InvoiceStatusBadge } from '@/components/common/StatusBadge.jsx';
import { MANAGEMENT_ROLES } from '@/constants/roles.js';
import { useInvoices, useGenerateInvoice } from '../hooks/useFinance.js';
import { useContracts } from 'modules/contract/frontend/hooks/useContract.js';
import { useApartments } from 'modules/building/frontend/hooks/useBuilding.js';
import { useFilterState } from '@/hooks/useFilterState.js';
import { Modal } from '@/components/common/Modal.jsx';
import { ModalFooter } from '@/components/forms/ModalFooter.jsx';

const formatCurrency = (v) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v));

const getCurrentMonthStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export default function InvoicesPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  // Batch Generation States
  const [batchMonth, setBatchMonth] = useState(getCurrentMonthStr());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResults, setGenerationResults] = useState([]); // Array of { contract, success, error }

  const defaultFilters = {
    status: '',
    billing_month: '',
    apartment_id: '',
  };

  const { filters, hasActiveFilters, setFilter, clearAll } = useFilterState(defaultFilters, null);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters.status, filters.billing_month, filters.apartment_id]);

  const params = {
    page,
    limit: 20,
    status: filters.status || undefined,
    billing_month: filters.billing_month || undefined,
    apartment_id: filters.apartment_id || undefined,
  };

  const { data, isLoading, refetch } = useInvoices(params);
  const { data: activeContractsData } = useContracts({ status: 'ACTIVE', limit: 100 });
  const { data: apartmentsData } = useApartments({ limit: 100 });
  const activeContracts = activeContractsData?.items ?? [];
  const apartments = apartmentsData?.items ?? [];

  const invoices = data?.items ?? [];
  const total = data?.total ?? 0;

  const handlePageChange = useCallback((p) => setPage(p), []);

  const { mutateAsync: generateInvoiceMutate } = useGenerateInvoice();

  const handleBatchGenerate = async () => {
    if (!batchMonth) return;
    setIsGenerating(true);
    setGenerationResults([]);

    const results = [];
    for (const contract of activeContracts) {
      // Initialize state for this contract
      results.push({ contract, status: 'processing' });
      setGenerationResults([...results]);

      try {
        await generateInvoiceMutate({
          contract_id: contract.id,
          billing_month: batchMonth,
          other_amount: 0
        });
        results[results.length - 1] = { contract, status: 'success' };
      } catch (err) {
        results[results.length - 1] = {
          contract,
          status: 'error',
          error: err.response?.data?.message || err.message
        };
      }
      setGenerationResults([...results]);
    }

    setIsGenerating(false);
    refetch();
  };

  const columns = [
    {
      key: 'invoice_code',
      label: 'Mã hóa đơn',
      render: (row) => (
        <span className="font-mono font-medium text-indigo-600 hover:underline cursor-pointer" onClick={() => navigate(`/invoices/${row.id}`)}>
          {row.invoice_code}
        </span>
      ),
    },
    {
      key: 'apartment_code',
      label: 'Căn hộ',
      render: (row) => (
        <span className="font-mono table-cell-primary">
          {row.apartment?.apartment_code ?? '—'}
        </span>
      ),
    },
    {
      key: 'tenant_name',
      label: 'Khách thuê',
      render: (row) => <span className="table-cell-secondary">{row.contract?.tenant?.full_name ?? '—'}</span>,
    },
    {
      key: 'billing_month',
      label: 'Kỳ thanh toán',
      render: (row) => <span className="table-cell-secondary font-medium">{row.billing_month}</span>,
    },
    {
      key: 'total_amount',
      label: 'Tổng tiền',
      render: (row) => <span className="table-cell-primary font-semibold">{formatCurrency(row.total_amount)}</span>,
    },
    {
      key: 'due_date',
      label: 'Hạn thanh toán',
      render: (row) => {
        if (!row.due_date) return '—';
        return <span className="table-cell-muted">{new Date(row.due_date).toLocaleDateString('vi-VN')}</span>;
      },
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (row) => <InvoiceStatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <button
          onClick={() => navigate(`/invoices/${row.id}`)}
          className="btn-ghost py-1 px-2.5 text-xs flex items-center gap-1"
          id={`view-inv-${row.id}`}
        >
          <Eye size={13} />
          Xem chi tiết
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Hóa đơn"
        subtitle={`Quản lý công nợ và hóa đơn tháng (${total} hóa đơn)`}
        action={
          <RoleGuard roles={MANAGEMENT_ROLES}>
            <button
              onClick={() => {
                setGenerationResults([]);
                setIsGenerateModalOpen(true);
              }}
              className="btn-primary flex items-center gap-2"
              id="generate-invoices-btn"
            >
              <Receipt size={16} />
              Lập hóa đơn tháng
            </button>
          </RoleGuard>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm">
        <div className="w-full sm:w-48">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            Trạng thái đóng tiền
          </label>
          <select
            value={filters.status}
            onChange={(e) => setFilter('status', e.target.value)}
            className="input w-full"
            id="filter-status-select"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="UNPAID">Chưa thanh toán</option>
            <option value="PARTIALLY_PAID">Thanh toán một phần</option>
            <option value="PAID">Đã thanh toán</option>
            <option value="OVERDUE">Quá hạn</option>
          </select>
        </div>

        <div className="w-full sm:w-48">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            Căn hộ
          </label>
          <select
            value={filters.apartment_id}
            onChange={(e) => setFilter('apartment_id', e.target.value)}
            className="input w-full"
            id="filter-apartment-select"
          >
            <option value="">Tất cả căn hộ</option>
            {apartments.map((a) => (
              <option key={a.id} value={a.id}>{a.apartment_code}</option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-48">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            Kỳ thanh toán (Tháng)
          </label>
          <input
            type="month"
            value={filters.billing_month}
            onChange={(e) => setFilter('billing_month', e.target.value)}
            className="input w-full"
            id="filter-month-input"
          />
        </div>

        {hasActiveFilters && (
          <button
            onClick={() => {
              clearAll();
              setPage(1);
            }}
            className="btn-ghost text-red-500 hover:text-red-600 hover:bg-red-500/10 transition px-4 py-2 mt-5 text-sm rounded-lg flex items-center gap-1.5"
            id="clear-filters-btn"
          >
            <RotateCcw size={14} />
            Xóa bộ lọc
          </button>
        )}
      </div>

      {total === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed rounded-xl bg-gray-50/50 dark:bg-gray-900/10 border-gray-200 dark:border-gray-800 text-center my-6">
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-400 mb-4 animate-bounce">
            <Search size={32} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Không tìm thấy hóa đơn nào
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
            Không có hóa đơn nào phù hợp với các tiêu chí lọc được chọn. Thử xóa hoặc đặt lại bộ lọc.
          </p>
          <button
            onClick={() => {
              clearAll();
              setPage(1);
            }}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 shadow-sm rounded-lg"
          >
            <RotateCcw size={16} />
            Đặt lại bộ lọc
          </button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={invoices}
          total={total}
          page={page}
          onPageChange={handlePageChange}
          isLoading={isLoading}
          emptyMessage="Không tìm thấy hóa đơn nào."
        />
      )}

      {/* Generation Modal */}
      {isGenerateModalOpen && (
        <Modal
          title="Lập hóa đơn tháng hàng loạt"
          onClose={() => !isGenerating && setIsGenerateModalOpen(false)}
          size="md"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleBatchGenerate();
            }}
            className="space-y-4"
          >
            <p className="text-sm text-gray-500">
              Hệ thống sẽ tạo hóa đơn hàng tháng cho tất cả hợp đồng có hiệu lực dựa trên số điện nước đã ghi nhận và danh sách dịch vụ đăng ký.
            </p>

            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-lg flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <span>
                <strong>Lưu ý:</strong> Cần hoàn thành việc ghi chỉ số Điện & Nước cho các căn hộ trước khi tiến hành lập hóa đơn. Các căn hộ chưa ghi nhận chỉ số sẽ báo lỗi.
              </span>
            </div>

            <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Tháng lập hóa đơn
                </label>
                <input
                  type="month"
                  value={batchMonth}
                  onChange={(e) => setBatchMonth(e.target.value)}
                  className="input w-full"
                  disabled={isGenerating}
                />
              </div>
              <div className="mt-6 text-sm text-slate-500 font-medium">
                Tìm thấy {activeContracts.length} hợp đồng hoạt động.
              </div>
            </div>

            {/* Results tracking area */}
            {generationResults.length > 0 && (
              <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 max-h-60 overflow-y-auto space-y-2 text-xs">
                <p className="font-semibold text-slate-700 mb-1 border-b pb-1 text-sm">Tiến độ lập hóa đơn:</p>
                {generationResults.map(({ contract, status, error }, idx) => (
                  <div key={idx} className="flex justify-between items-start gap-2">
                    <span className="font-medium text-slate-600">
                      Căn hộ {contract.apartment?.apartment_code} ({contract.tenant?.full_name})
                    </span>
                    {status === 'processing' && (
                      <span className="text-blue-600 animate-pulse font-medium">Đang xử lý...</span>
                    )}
                    {status === 'success' && (
                      <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                        <CheckCircle size={12} /> Thành công
                      </span>
                    )}
                    {status === 'error' && (
                      <span className="text-rose-600 font-semibold max-w-[200px] text-right">
                        Lỗi: {error}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <ModalFooter
              onCancel={() => setIsGenerateModalOpen(false)}
              submitLabel={isGenerating ? "Đang tạo hóa đơn..." : "Bắt đầu lập hóa đơn"}
              isLoading={isGenerating}
              submitDisabled={!batchMonth || isGenerating || activeContracts.length === 0}
            />
          </form>
        </Modal>
      )}
    </div>
  );
}
