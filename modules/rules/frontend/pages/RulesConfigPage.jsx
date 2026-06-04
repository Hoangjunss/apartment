// modules/rules/frontend/pages/RulesConfigPage.jsx
import { useState, useEffect } from 'react';
import { api } from '@/lib/axios.js';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { Play, Plus, Trash2, Edit2, ShieldAlert, Check, X, RefreshCw } from 'lucide-react';
import { Modal } from '@/components/common/Modal.jsx';
import { FormField } from '@/components/forms/FormField.jsx';
import { ModalFooter } from '@/components/forms/ModalFooter.jsx';

const ENTITY_OPTIONS = [
  { value: 'Contract', label: 'Hợp đồng' },
  { value: 'ServiceRequest', label: 'Yêu cầu kỹ thuật' },
  { value: 'Invoice', label: 'Hóa đơn' }
];

const FIELD_OPTIONS = {
  Contract: [{ value: 'days_remaining', label: 'Số ngày còn lại (days_remaining)' }],
  ServiceRequest: [{ value: 'days_to_start', label: 'Số ngày chuẩn bị bắt đầu (days_to_start)' }],
  Invoice: [{ value: 'days_overdue', label: 'Số ngày quá hạn thanh toán (days_overdue)' }]
};

const OPERATOR_OPTIONS = [
  { value: '==', label: 'Bằng (==)' },
  { value: '!=', label: 'Khác (!=)' },
  { value: '>', label: 'Lớn hơn (>)' },
  { value: '>=', label: 'Lớn hơn hoặc bằng (>=)' },
  { value: '<', label: 'Nhỏ hơn (<)' },
  { value: '<=', label: 'Nhỏ hơn hoặc bằng (<=)' }
];

const ACTION_OPTIONS = [
  { value: 'SEND_NOTIFICATION', label: 'Gửi thông báo nhắc nhở (SEND_NOTIFICATION)' },
  { value: 'MARK_OVERDUE', label: 'Đánh dấu quá hạn (MARK_OVERDUE)' }
];

export default function RulesConfigPage() {
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [entity, setEntity] = useState('Contract');
  const [field, setField] = useState('days_remaining');
  const [operator, setOperator] = useState('<=');
  const [value, setValue] = useState('');
  const [action, setAction] = useState('SEND_NOTIFICATION');
  const [template, setTemplate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRules = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/rules');
      setRules(res.data.data || []);
    } catch (err) {
      toast.error('Không thể tải danh sách luật nghiệp vụ: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  // Update default field when entity changes
  useEffect(() => {
    if (FIELD_OPTIONS[entity]) {
      setField(FIELD_OPTIONS[entity][0].value);
    }
  }, [entity]);

  const handleOpenCreateModal = () => {
    setEditingRule(null);
    setName('');
    setEntity('Contract');
    setField('days_remaining');
    setOperator('<=');
    setValue('');
    setAction('SEND_NOTIFICATION');
    setTemplate('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rule) => {
    setEditingRule(rule);
    setName(rule.name);
    setEntity(rule.entity);
    setField(rule.condition?.field || '');
    setOperator(rule.condition?.operator || '==');
    setValue(rule.condition?.value || '');
    setAction(rule.action);
    setTemplate(rule.action_data?.template || '');
    setIsActive(rule.is_active);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !value) {
      toast.error('Vui lòng nhập tên luật và giá trị so sánh');
      return;
    }

    const payload = {
      name,
      entity,
      condition: {
        field,
        operator,
        value: Number(value)
      },
      action,
      action_data: {
        template
      },
      is_active: isActive
    };

    setIsSubmitting(true);
    try {
      if (editingRule) {
        await api.put(`/rules/${editingRule.id}`, payload);
        toast.success('Cập nhật luật thành công!');
      } else {
        await api.post('/rules', payload);
        toast.success('Thêm luật mới thành công!');
      }
      setIsModalOpen(false);
      await fetchRules();
    } catch (err) {
      toast.error('Có lỗi xảy ra: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRule = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa quy tắc này?')) return;

    try {
      await api.delete(`/rules/${id}`);
      toast.success('Đã xóa quy tắc nghiệp vụ');
      await fetchRules();
    } catch (err) {
      toast.error('Không thể xóa quy tắc: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleTriggerScan = async () => {
    setIsScanning(true);
    toast.loading('Đang chạy quét quy tắc hệ thống...', { id: 'scan-toast' });
    try {
      await api.post('/rules/trigger-scan');
      toast.success('Quét quy tắc thành công. Đã gửi các thông báo nhắc nhở tương ứng!', { id: 'scan-toast' });
    } catch (err) {
      toast.error('Lỗi khi chạy quét quy tắc: ' + (err.response?.data?.message || err.message), { id: 'scan-toast' });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý luật nghiệp vụ (Rules Engine)"
        subtitle="Thiết lập các điều kiện tự động hóa phẳng (không lồng ghép) như nhắc nhở hết hạn, quá hạn hóa đơn."
        action={
          <div className="flex gap-2">
            <button
              onClick={handleTriggerScan}
              disabled={isScanning}
              className="btn-secondary flex items-center gap-1.5"
            >
              <RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} />
              Quét quy tắc ngay
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="btn-primary flex items-center gap-1.5"
              id="add-rule-btn"
            >
              <Plus size={16} />
              Thêm luật mới
            </button>
          </div>
        }
      />

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-400 mb-4">
              <ShieldAlert size={32} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Chưa có luật nghiệp vụ nào
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4">
              Tạo luật nghiệp vụ đầu tiên để hệ thống tự động xử lý thông báo và nhắc nhở.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/10 text-xs font-semibold text-gray-400 uppercase">
                  <th className="py-3 px-4">Tên luật</th>
                  <th className="py-3 px-4">Đối tượng (Entity)</th>
                  <th className="py-3 px-4">Điều kiện (Condition)</th>
                  <th className="py-3 px-4">Hành động (Action)</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm text-gray-700 dark:text-gray-300">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-4 px-4 font-semibold text-gray-900 dark:text-white">
                      {rule.name}
                    </td>
                    <td className="py-4 px-4">
                      <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded text-xs font-medium">
                        {ENTITY_OPTIONS.find(o => o.value === rule.entity)?.label || rule.entity}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono text-xs">
                      <span className="text-blue-600 dark:text-blue-400">
                        {rule.condition?.field}
                      </span>{' '}
                      <span className="text-purple-600 dark:text-purple-400">
                        {rule.condition?.operator}
                      </span>{' '}
                      <span className="text-green-600 dark:text-green-400 font-bold">
                        {rule.condition?.value}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <span className="text-xs bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 px-2 py-0.5 rounded font-mono font-medium">
                          {rule.action}
                        </span>
                        {rule.action_data?.template && (
                          <p className="text-xs text-gray-400 line-clamp-1 italic">
                            "{rule.action_data.template}"
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {rule.is_active ? (
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-green-200 dark:border-green-900/30">
                          <Check size={12} />
                          Kích hoạt
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
                          <X size={12} />
                          Bị khoá
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(rule)}
                          className="btn-icon"
                          title="Chỉnh sửa"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="btn-icon text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Xóa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form Create/Edit */}
      {isModalOpen && (
        <Modal
          title={editingRule ? 'Chỉnh sửa quy tắc nghiệp vụ' : 'Thêm quy tắc mới'}
          onClose={() => setIsModalOpen(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Tên quy tắc" required>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Cảnh báo hợp đồng sắp hết hạn 30 ngày"
                className="input"
                required
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Đối tượng (Entity)" required>
                <select
                  value={entity}
                  onChange={(e) => setEntity(e.target.value)}
                  className="input"
                >
                  {ENTITY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Trường dữ liệu (Field)" required>
                <select
                  value={field}
                  onChange={(e) => setField(e.target.value)}
                  className="input"
                >
                  {FIELD_OPTIONS[entity]?.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Phép so sánh" required>
                <select
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="input"
                >
                  {OPERATOR_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Giá trị số ngày so sánh" required>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="VD: 30 hoặc 2"
                  className="input"
                  required
                />
              </FormField>
            </div>

            <FormField label="Hành động khi thỏa mãn" required>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="input"
              >
                {ACTION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Mẫu tin nhắn thông báo (Template)">
              <textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                placeholder={
                  entity === 'Contract'
                    ? 'VD: Hợp đồng {contract_code} thuộc phòng {apartment_code} sắp hết hạn trong {days_remaining} ngày.'
                    : entity === 'ServiceRequest'
                    ? 'VD: Yêu cầu bảo trì "{title}" sắp đến hạn thực hiện ngày {scheduled_start_date}.'
                    : 'VD: Hóa đơn {invoice_code} quá hạn thanh toán {days_overdue} ngày.'
                }
                rows={3}
                className="input py-2 resize-none"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Các biến hỗ trợ thay thế: {entity === 'Contract' ? '{contract_code}, {apartment_code}, {days_remaining}' : entity === 'ServiceRequest' ? '{title}, {scheduled_start_date}' : '{invoice_code}, {days_overdue}'}.
              </p>
            </FormField>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isActiveCheckbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <label htmlFor="isActiveCheckbox" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                Kích hoạt quy tắc tự động quét hàng ngày
              </label>
            </div>

            <ModalFooter
              onCancel={() => setIsModalOpen(false)}
              isLoading={isSubmitting}
              submitLabel={editingRule ? 'Cập nhật' : 'Tạo mới'}
            />
          </form>
        </Modal>
      )}
    </div>
  );
}
