// modules/contract/frontend/pages/ContractDetailPage.jsx
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Edit2, RefreshCw, XCircle, Printer } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { LoadingSpinner } from '@/components/common/LoadingSpinner.jsx';
import { EmptyState } from '@/components/common/EmptyState.jsx';
import { ContractStatusBadge } from '@/components/common/StatusBadge.jsx';
import { RoleGuard } from '@/components/common/RoleGuard.jsx';
import { MANAGEMENT_ROLES } from '@/constants/roles.js';
import { useContractById, useRenewals } from '../hooks/useContract.js';
import { RenewForm } from '../components/RenewForm.jsx';
import { TerminateForm } from '../components/TerminateForm.jsx';
import { ContractEditForm } from '../components/ContractEditForm.jsx';
import { format, parseISO, differenceInDays } from 'date-fns';

const formatCurrency = (v) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v));

// ── Renewals Tab ───────────────────────────────────────────────────────────────
function RenewalsTab({ contractId }) {
  const { data, isLoading } = useRenewals(contractId);
  const renewals = Array.isArray(data) ? data : [];

  if (isLoading) return <LoadingSpinner />;
  if (renewals.length === 0) return <EmptyState message="Chưa có lịch sử gia hạn" />;

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ngày cũ</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ngày mới</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Giá mới</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Người gia hạn</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Thời gian</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {renewals.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-600">{r.old_end_date ? format(parseISO(r.old_end_date), 'dd/MM/yyyy') : '—'}</td>
              <td className="px-4 py-3 font-medium text-gray-800">{r.new_end_date ? format(parseISO(r.new_end_date), 'dd/MM/yyyy') : '—'}</td>
              <td className="px-4 py-3">{r.new_monthly_rent ? formatCurrency(r.new_monthly_rent) : 'Giữ nguyên'}</td>
              <td className="px-4 py-3 text-gray-600">{r.user?.full_name ?? '—'}</td>
              <td className="px-4 py-3 text-xs text-gray-400">
                {r.created_at ? format(parseISO(r.created_at), 'dd/MM/yyyy HH:mm') : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ContractDetailPage() {
  const { id } = useParams();
  const contractId = Number(id);
  const [activeTab, setActiveTab] = useState('tenant');
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [isTerminateOpen, setIsTerminateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: contract, isLoading } = useContractById(contractId);

  if (isLoading) return <LoadingSpinner />;
  if (!contract) return <EmptyState message="Không tìm thấy hợp đồng" />;

  const canAct = contract.status === 'ACTIVE' || contract.status === 'EXPIRING_SOON';
  const daysLeft = contract.end_date ? differenceInDays(parseISO(contract.end_date), new Date()) : null;

  const tabs = [
    { key: 'tenant', label: 'Thông tin khách thuê' },
    { key: 'apartment', label: 'Thông tin phòng' },
    { key: 'renewals', label: 'Lịch sử gia hạn' },
  ];

  return (
    <div>
      {/* Interactive Screen View */}
      <div className="print:hidden">
        <PageHeader
          title={`Hợp đồng #${contract.id}`}
          backUrl="/contracts"
          action={
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="btn-secondary flex items-center gap-1.5 no-print" id="print-contract-btn">
                <Printer size={14} />
                In PDF
              </button>
              <RoleGuard roles={MANAGEMENT_ROLES}>
                <div className="flex gap-2 no-print">
                  <button onClick={() => setIsEditOpen(true)} className="btn-secondary" id="edit-contract-btn">
                    <Edit2 size={14} />
                    Sửa điều khoản
                  </button>
                  {canAct && (
                    <>
                      <button onClick={() => setIsRenewOpen(true)} className="btn-primary" id="renew-contract-btn">
                        <RefreshCw size={14} />
                        Gia hạn
                      </button>
                      <button onClick={() => setIsTerminateOpen(true)} className="btn-danger" id="terminate-contract-btn">
                        <XCircle size={14} />
                        Chấm dứt
                      </button>
                    </>
                  )}
                </div>
              </RoleGuard>
            </div>
          }
        />

        {/* Info Card */}
        <div className="card p-5 mb-6">
          <div className="flex items-center gap-3 mb-4 no-print">
            <ContractStatusBadge status={contract.status} daysLeft={daysLeft} />
            {contract.status === 'EXPIRING_SOON' && daysLeft <= 7 && (
              <span className="text-xs text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded">
                ⚠ Còn {daysLeft} ngày!
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <p className="info-label">Mã hợp đồng</p>
              <p className="info-value font-mono font-semibold text-indigo-600">{contract.contract_code}</p>
            </div>
            <div>
              <p className="info-label">Ngày bắt đầu</p>
              <p className="info-value">{format(parseISO(contract.start_date), 'dd/MM/yyyy')}</p>
            </div>
            <div>
              <p className="info-label">Ngày kết thúc</p>
              <p className="info-value">{format(parseISO(contract.end_date), 'dd/MM/yyyy')}</p>
            </div>
            <div>
              <p className="info-label">Giá thuê/tháng</p>
              <p className="info-value font-semibold text-gray-900">{formatCurrency(contract.monthly_rent)}</p>
            </div>
            <div>
              <p className="info-label">Tiền đặt cọc</p>
              <p className="info-value">{formatCurrency(contract.deposit_amount)}</p>
            </div>
            <div>
              <p className="info-label">Hạn đóng tiền</p>
              <p className="info-value">Ngày {contract.payment_due_day} hằng tháng</p>
            </div>
            <div>
              <p className="info-label">Số người ở</p>
              <p className="info-value font-semibold text-slate-800">{contract.soNguoiO || contract.occupants_count || 1} người</p>
            </div>
            <div>
              <p className="info-label">Đơn giá nước</p>
              <p className="info-value">100.000 đ/người/tháng</p>
            </div>
            <div>
              <p className="info-label">Đơn giá điện</p>
              <p className="info-value">{formatCurrency(contract.electricity_price)} /kWh</p>
            </div>
            <div>
              <p className="info-label">Điện ban đầu</p>
              <p className="info-value">{Number(contract.initial_electricity)} kWh</p>
            </div>
            <div>
              <p className="info-label">Nước ban đầu</p>
              <p className="info-value">{contract.initial_water !== null && contract.initial_water !== undefined ? `${Number(contract.initial_water)} m³` : '—'}</p>
            </div>
            <div>
              <p className="info-label">Báo trước khi chấm dứt</p>
              <p className="info-value">{contract.termination_notice_days || 30} ngày</p>
            </div>
            {contract.furniture_handover && (
              <div className="col-span-2">
                <p className="info-label">Bàn giao nội thất</p>
                <p className="info-value text-sm bg-slate-50 p-2 rounded border border-slate-100 mt-1">{contract.furniture_handover}</p>
              </div>
            )}
            {contract.notes && (
              <div className="col-span-2">
                <p className="info-label">Ghi chú</p>
                <p className="info-value text-sm">{contract.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-5">
          <div className="flex gap-0">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`tab-btn ${activeTab === tab.key ? 'tab-btn-active' : 'tab-btn-inactive'}`}
                id={`tab-${tab.key}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'tenant' && (
          <div className="card p-5">
            {contract.tenant ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="info-label">Họ tên</p>
                    <Link to={`/tenants/${contract.tenant.id}`} className="text-sm text-blue-600 hover:underline font-medium">
                      {contract.tenant.full_name}
                    </Link>
                  </div>
                  <div>
                    <p className="info-label">Số CCCD</p>
                    <p className="info-value font-mono">{contract.tenant.national_id}</p>
                  </div>
                  <div>
                    <p className="info-label">Số điện thoại</p>
                    <p className="info-value">{contract.tenant.phone}</p>
                  </div>
                  <div>
                    <p className="info-label">Email</p>
                    <p className="info-value">{contract.tenant.email || '—'}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Link to={`/tenants/${contract.tenant.id}`} className="btn-secondary">
                    Xem hồ sơ đầy đủ →
                  </Link>
                </div>
              </>
            ) : (
              <EmptyState message="Không có thông tin khách thuê" />
            )}
          </div>
        )}

        {activeTab === 'apartment' && (
          <div className="card p-5">
            {contract.apartment ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="info-label">Mã phòng</p>
                    <Link to={`/apartments/${contract.apartment.id}`} className="text-sm text-blue-600 hover:underline font-mono">
                      {contract.apartment.apartment_code}
                    </Link>
                  </div>
                  <div>
                    <p className="info-label">Tòa nhà / Tầng</p>
                    <p className="info-value">
                      {contract.apartment.floor?.building?.name} / Tầng {contract.apartment.floor?.floor_number}
                    </p>
                  </div>
                  <div>
                    <p className="info-label">Diện tích</p>
                    <p className="info-value">{contract.apartment.area_sqm} m²</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Link to={`/apartments/${contract.apartment.id}`} className="btn-secondary">
                    Xem chi tiết phòng →
                  </Link>
                </div>
              </>
            ) : (
              <EmptyState message="Không có thông tin căn hộ" />
            )}
          </div>
        )}

        {activeTab === 'renewals' && <RenewalsTab contractId={contractId} />}
      </div>

      {/* PDF Legal Document Print View */}
      <div className="hidden print:block print-contract-document font-serif text-[13px] leading-relaxed mx-auto p-10 max-w-[800px] text-justify">
        {/* Title */}
        <div className="text-center space-y-1 mb-8">
          <h3 className="font-bold text-sm tracking-widest uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h3>
          <h4 className="font-semibold text-xs tracking-wider border-b border-black pb-3 mx-auto w-48 text-center">Độc lập – Tự do – Hạnh phúc</h4>
          <h2 className="font-bold text-xl uppercase tracking-wider pt-6 text-center">HỢP ĐỒNG THUÊ CĂN HỘ</h2>
          <p className="font-mono text-xs italic text-center">Số: {contract.contract_code}</p>
        </div>

        {/* Date & location */}
        <p className="mb-4">
          Hôm nay, ngày {new Date(contract.start_date).getDate()} tháng {new Date(contract.start_date).getMonth() + 1} năm {new Date(contract.start_date).getFullYear()},
          tại địa chỉ: {contract.apartment?.floor?.building?.address || '.......................................................................'}
        </p>

        <p className="mb-4 font-semibold">Chúng tôi gồm:</p>

        {/* Bên A */}
        <div className="mb-6 space-y-1">
          <p className="font-bold">BÊN CHO THUÊ (Bên A):</p>
          <p className="pl-6">Công ty/Chủ sở hữu: QLCHDC</p>
          <p className="pl-6">Địa chỉ: {contract.apartment?.floor?.building?.address || '.......................................................................'}</p>
        </div>

        {/* Bên B */}
        <div className="mb-6 space-y-1">
          <p className="font-bold">BÊN THUÊ (Bên B):</p>
          <p className="pl-6">Họ tên: {contract.tenant?.full_name}</p>
          <p className="pl-6">CCCD/CMND: <span className="font-mono">{contract.tenant?.national_id}</span></p>
          <p className="pl-6">Số điện thoại: {contract.tenant?.phone}</p>
          <p className="pl-6">Email: {contract.tenant?.email || '...................................'}</p>
        </div>

        {/* Điều 1 */}
        <div className="mb-6">
          <p className="font-bold">ĐIỀU 1 – ĐỐI TƯỢNG HỢP ĐỒNG</p>
          <p className="pl-6">Bên A đồng ý cho Bên B thuê căn hộ:</p>
          <ul className="list-disc pl-12 space-y-1 mt-1">
            <li>Phòng: <span className="font-mono font-semibold">{contract.apartment?.apartment_code}</span></li>
            <li>Tòa nhà: {contract.apartment?.floor?.building?.name}</li>
            <li>Địa chỉ: {contract.apartment?.floor?.building?.address}</li>
            <li>Diện tích: {contract.apartment?.area_sqm} m²</li>
            <li>Loại phòng: {contract.apartment?.room_type}</li>
          </ul>
        </div>

        {/* Điều 2 */}
        <div className="mb-6">
          <p className="font-bold">ĐIỀU 2 – THỜI HẠN THUÊ</p>
          <p className="pl-6">
            Từ ngày {new Date(contract.start_date).toLocaleDateString('vi-VN')} đến ngày {new Date(contract.end_date).toLocaleDateString('vi-VN')}
          </p>
        </div>

        {/* Điều 3 */}
        <div className="mb-6 space-y-1">
          <p className="font-bold">ĐIỀU 3 – GIÁ THUÊ VÀ PHƯƠNG THỨC THANH TOÁN</p>
          <p className="pl-6">- Giá thuê: <span className="font-semibold">{formatCurrency(contract.monthly_rent)}</span>/tháng</p>
          <p className="pl-6">- Ngày đóng tiền: ngày {contract.payment_due_day} hàng tháng</p>
          <p className="pl-6">- Hình thức: Chuyển khoản hoặc tiền mặt</p>
        </div>

        {/* Điều 4 */}
        <div className="mb-6 space-y-1">
          <p className="font-bold">ĐIỀU 4 – TIỀN ĐẶT CỌC</p>
          <p className="pl-6">- Số tiền đặt cọc: <span className="font-semibold">{formatCurrency(contract.deposit_amount)}</span></p>
          <p className="pl-6">
            - Hoàn trả trong vòng 30 ngày sau khi kết thúc hợp đồng, trừ các khoản khấu trừ hợp lệ (nếu có).
          </p>
        </div>

        {/* Điều 5 */}
        <div className="mb-6 space-y-1">
          <p className="font-bold">ĐIỀU 5 – CHI PHÍ ĐIỆN NƯỚC VÀ DỊCH VỤ</p>
          <p className="pl-6">- Tiền điện: <span className="font-semibold">{formatCurrency(contract.electricity_price)}</span>/kWh (Chỉ số ban đầu: {Number(contract.initial_electricity)} kWh)</p>
          <p className="pl-6">- Tiền nước: 100.000 đ/người/tháng (Số người ở: {contract.soNguoiO || contract.occupants_count || 1} người)</p>
          <p className="pl-6">- Các dịch vụ khác theo thực tế phát sinh.</p>
        </div>

        {/* Điều 6 */}
        <div className="mb-6">
          <p className="font-bold">ĐIỀU 6 – TRÁCH NHIỆM CÁC BÊN</p>
          <p className="pl-6">
            Bên B có trách nhiệm giữ gìn tài sản, không tự ý cải tạo, sửa chữa khi chưa có sự đồng ý của Bên A.
          </p>
        </div>

        {/* Điều 7 */}
        <div className="mb-6">
          <p className="font-bold">ĐIỀU 7 – CHẤM DỨT HỢP ĐỒNG TRƯỚC HẠN</p>
          <p className="pl-6">
            Một trong hai bên muốn chấm dứt hợp đồng trước hạn phải thông báo trước {contract.termination_notice_days || 30} ngày.
          </p>
        </div>

        {/* Điều 8 */}
        <div className="mb-6">
          <p className="font-bold">ĐIỀU 8 – NỘI THẤT BÀN GIAO</p>
          <p className="pl-6 whitespace-pre-wrap">{contract.furniture_handover || 'Không có'}</p>
        </div>

        {/* Điều 9 */}
        <div className="mb-6">
          <p className="font-bold">ĐIỀU 9 – ĐIỀU KHOẢN BỔ SUNG</p>
          <p className="pl-6 whitespace-pre-wrap">{contract.notes || 'Không có'}</p>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 text-center mt-12 gap-8" style={{ marginTop: '60px' }}>
          <div>
            <p className="font-bold uppercase">ĐẠI DIỆN BÊN A</p>
            <p className="text-xs text-gray-500 italic mt-0.5">(Ký, ghi rõ họ tên)</p>
            <div className="h-24"></div>
            <p className="font-semibold">...................................</p>
          </div>
          <div>
            <p className="font-bold uppercase">ĐẠI DIỆN BÊN B</p>
            <p className="text-xs text-gray-500 italic mt-0.5">(Ký, ghi rõ họ tên)</p>
            <div className="h-24"></div>
            <p className="font-semibold">{contract.tenant?.full_name}</p>
          </div>
        </div>
      </div>

      {isRenewOpen && <RenewForm onClose={() => setIsRenewOpen(false)} contract={contract} />}
      {isTerminateOpen && <TerminateForm onClose={() => setIsTerminateOpen(false)} contract={contract} />}
      {isEditOpen && <ContractEditForm onClose={() => setIsEditOpen(false)} contract={contract} />}
    </div>
  );
}
