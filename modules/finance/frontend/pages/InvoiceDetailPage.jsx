import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Receipt, Calendar, User, Home, Plus } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { RoleGuard } from '@/components/common/RoleGuard.jsx';
import { InvoiceStatusBadge } from '@/components/common/StatusBadge.jsx';
import { TENANT_ACCESS_ROLES } from '@/constants/roles.js';
import { useInvoiceById, useUtilities } from '../hooks/useFinance.js';
import { PaymentForm } from '../components/PaymentForm.jsx';

const formatCurrency = (v) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v));

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const { data: invoice, isLoading, error } = useInvoiceById(Number(id));

  // Query utility readings to show detailed indexes breakdown if available
  const { data: utilitiesData } = useUtilities({
    apartment_id: invoice?.apartment_id,
    billing_month: invoice?.billing_month
  });
  const utilityReading = utilitiesData?.items?.[0]; // Get matched reading

  if (isLoading) {
    return <div className="text-center py-12 text-slate-500">Đang tải chi tiết hóa đơn...</div>;
  }

  if (error || !invoice) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-rose-600 font-medium">Hóa đơn không tồn tại hoặc đã xảy ra lỗi.</p>
        <button onClick={() => navigate('/invoices')} className="btn-ghost flex items-center gap-1 mx-auto">
          <ArrowLeft size={16} /> Quay lại danh sách
        </button>
      </div>
    );
  }

  const payments = invoice.payments ?? [];
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Math.max(0, Number(invoice.total_amount) - totalPaid);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/invoices')} className="btn-ghost p-2" id="back-to-invoices-btn">
          <ArrowLeft size={18} />
        </button>
        <span className="text-sm font-medium text-slate-500">Quay lại danh sách hóa đơn</span>
      </div>

      <PageHeader
        title={`Chi tiết hóa đơn ${invoice.invoice_code}`}
        subtitle={`Lập vào ngày ${new Date(invoice.created_at).toLocaleDateString('vi-VN')}`}
        action={
          invoice.status !== 'PAID' && (
            <RoleGuard roles={TENANT_ACCESS_ROLES}>
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="btn-primary flex items-center gap-2"
                id="add-payment-btn"
              >
                <Plus size={16} />
                Ghi nhận thanh toán
              </button>
            </RoleGuard>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Invoice details sheets */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Visual Sheet */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 md:p-8 space-y-6">
              {/* Header section */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-6 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-800">PHIẾU THU THÁNG {invoice.billing_month}</h2>
                    <InvoiceStatusBadge status={invoice.status} />
                  </div>
                  <p className="text-sm text-slate-400 font-mono">{invoice.invoice_code}</p>
                </div>
                <div className="text-right text-sm text-slate-500">
                  <div className="flex items-center gap-1.5 md:justify-end">
                    <Calendar size={14} />
                    <span>Hạn nộp: <strong className="text-rose-600">{new Date(invoice.due_date).toLocaleDateString('vi-VN')}</strong></span>
                  </div>
                  <div>Căn hộ: <span className="font-semibold font-mono text-slate-800">{invoice.apartment?.apartment_code}</span></div>
                </div>
              </div>

              {/* Entity info section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-1.5 border-b pb-1">
                    <User size={15} /> Khách thuê đại diện
                  </h3>
                  <div className="space-y-1 text-slate-600">
                    <p className="font-medium text-slate-800">{invoice.contract?.tenant?.full_name}</p>
                    <p>SĐT: {invoice.contract?.tenant?.phone}</p>
                    <p>CMND/CCCD: {invoice.contract?.tenant?.national_id}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-1.5 border-b pb-1">
                    <Home size={15} /> Chi tiết căn hộ
                  </h3>
                  <div className="space-y-1 text-slate-600">
                    <p>Phòng: <strong className="font-medium text-slate-800">{invoice.apartment?.apartment_code}</strong></p>
                    <p>Tòa nhà: {invoice.apartment?.floor?.building?.name}</p>
                    <p>Địa chỉ: {invoice.apartment?.floor?.building?.address}</p>
                  </div>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-800 flex items-center gap-1.5 border-b pb-1 text-sm">
                  <Receipt size={15} /> Chi tiết các khoản phí
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-slate-600 border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs tracking-wider border-b border-slate-100">
                        <th className="py-2.5 px-3">Khoản mục</th>
                        <th className="py-2.5 px-3">Chi tiết tiêu thụ / Số lượng</th>
                        <th className="py-2.5 px-3 text-right">Đơn giá</th>
                        <th className="py-2.5 px-3 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* Tiền phòng */}
                      <tr>
                        <td className="py-3 px-3 font-medium text-slate-800">Tiền thuê căn hộ</td>
                        <td className="py-3 px-3 text-slate-500">Tháng {invoice.billing_month}</td>
                        <td className="py-3 px-3 text-right">{formatCurrency(invoice.rent_amount)}</td>
                        <td className="py-3 px-3 text-right font-medium text-slate-800">
                          {formatCurrency(invoice.rent_amount)}
                        </td>
                      </tr>

                      {/* Điện */}
                      <tr>
                        <td className="py-3 px-3 font-medium text-slate-800">Tiền Điện</td>
                        <td className="py-3 px-3 text-slate-500 text-xs">
                          {utilityReading ? (
                            <>
                              Chỉ số: {Number(utilityReading.electricity_prev)} → {Number(utilityReading.electricity_curr)}
                              <span className="ml-1 font-semibold">({(Number(utilityReading.electricity_curr) - Number(utilityReading.electricity_prev)).toFixed(1)} kWh)</span>
                            </>
                          ) : (
                            'Ghi nhận theo chỉ số đồng hồ'
                          )}
                        </td>
                        <td className="py-3 px-3 text-right text-xs">
                          {utilityReading ? `${new Intl.NumberFormat('vi-VN').format(Number(utilityReading.electricity_unit_price))} đ/kWh` : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-800">
                          {formatCurrency(invoice.electricity_amount)}
                        </td>
                      </tr>

                      {/* Nước */}
                      <tr>
                        <td className="py-3 px-3 font-medium text-slate-800">Tiền Nước</td>
                        <td className="py-3 px-3 text-slate-500 text-xs">
                          {utilityReading ? (
                            <>
                              Chỉ số: {Number(utilityReading.water_prev)} → {Number(utilityReading.water_curr)}
                              <span className="ml-1 font-semibold">({(Number(utilityReading.water_curr) - Number(utilityReading.water_prev)).toFixed(1)} m³)</span>
                            </>
                          ) : (
                            'Ghi nhận theo chỉ số đồng hồ'
                          )}
                        </td>
                        <td className="py-3 px-3 text-right text-xs">
                          {utilityReading ? `${new Intl.NumberFormat('vi-VN').format(Number(utilityReading.water_unit_price))} đ/m³` : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-800">
                          {formatCurrency(invoice.water_amount)}
                        </td>
                      </tr>

                      {/* Dịch vụ đăng ký */}
                      {invoice.contract?.service_subscriptions?.map((sub, index) => {
                        const amount = Number(sub.quantity) * Number(sub.service.unit_price);
                        return (
                          <tr key={index}>
                            <td className="py-3 px-3 font-medium text-slate-800">
                              Dịch vụ: {sub.service?.name}
                            </td>
                            <td className="py-3 px-3 text-slate-500">SL: {sub.quantity} {sub.service?.unit}</td>
                            <td className="py-3 px-3 text-right text-xs">
                              {formatCurrency(sub.service?.unit_price)}
                            </td>
                            <td className="py-3 px-3 text-right font-medium text-slate-800">
                              {formatCurrency(amount)}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Khác / Phụ thu */}
                      {Number(invoice.other_amount) > 0 && (
                        <tr>
                          <td className="py-3 px-3 font-medium text-slate-800">Phụ thu / Chi phí khác</td>
                          <td className="py-3 px-3 text-slate-500">—</td>
                          <td className="py-3 px-3 text-right">—</td>
                          <td className="py-3 px-3 text-right font-medium text-slate-800">
                            {formatCurrency(invoice.other_amount)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Calculation Sheet */}
              <div className="border-t border-slate-100 pt-6 flex justify-end">
                <div className="w-full sm:w-64 space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between">
                    <span>Tổng cộng:</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(invoice.total_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Đã thanh toán:</span>
                    <span className="font-semibold text-emerald-600">{formatCurrency(totalPaid)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 border-slate-100 text-base font-bold text-slate-800">
                    <span>Còn lại cần thu:</span>
                    <span className={remaining > 0 ? "text-rose-600" : "text-emerald-600"}>
                      {formatCurrency(remaining)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-400 border-t pt-4">
                Người lập hóa đơn: {invoice.creator?.full_name ?? 'Hệ thống'}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Payment logs list */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b pb-3">
              <CreditCard size={18} className="text-indigo-600" />
              Lịch sử đóng tiền
            </h3>

            {payments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Chưa có lượt đóng tiền nào.</p>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {payments.map((p) => (
                  <div key={p.id} className="p-3 bg-slate-50 rounded-xl space-y-2 text-sm border border-slate-100">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">{formatCurrency(p.amount)}</span>
                      <span className="badge bg-slate-200/60 text-slate-700 text-xs">
                        {p.payment_method === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      <p>Ngày thu: {new Date(p.payment_date).toLocaleDateString('vi-VN')}</p>
                      {p.reference_number && <p className="font-mono">Mã giao dịch: {p.reference_number}</p>}
                      {p.note && <p className="italic">Ghi chú: "{p.note}"</p>}
                      <p className="pt-1 border-t border-slate-200/50 mt-1">Người thu: {p.recorder?.full_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isPaymentModalOpen && (
        <PaymentForm onClose={() => setIsPaymentModalOpen(false)} invoice={invoice} />
      )}
    </div>
  );
}
