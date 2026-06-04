// modules/workflow/frontend/pages/WorkflowConfigPage.jsx
import { useState, useEffect } from 'react';
import { api } from '@/lib/axios.js';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { GitFork, Plus, ChevronRight, Settings, Shield, PlusCircle } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'TECHNICIAN', label: 'Kỹ thuật viên' },
  { value: 'RECEPTIONIST', label: 'Lễ tân' }
];

export default function WorkflowConfigPage() {
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form states for creating step
  const [stepName, setStepName] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [isInitial, setIsInitial] = useState(false);
  const [isFinal, setIsFinal] = useState(false);
  const [isSubmittingStep, setIsSubmittingStep] = useState(false);

  // Form states for creating transition
  const [transitionName, setTransitionName] = useState('');
  const [fromStepId, setFromStepId] = useState('');
  const [toStepId, setToStepId] = useState('');
  const [allowedRoles, setAllowedRoles] = useState([]);
  const [isSubmittingTransition, setIsSubmittingTransition] = useState(false);

  const fetchWorkflows = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/workflows');
      setWorkflows(res.data.data || []);
      if (res.data.data && res.data.data.length > 0) {
        // Keep the currently selected workflow updated or pick the first one
        if (selectedWorkflow) {
          const updated = res.data.data.find(w => w.id === selectedWorkflow.id);
          setSelectedWorkflow(updated || res.data.data[0]);
        } else {
          setSelectedWorkflow(res.data.data[0]);
        }
      }
    } catch (err) {
      toast.error('Không thể tải cấu hình quy trình: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleAddStep = async (e) => {
    e.preventDefault();
    if (!stepName || !orderNumber) {
      toast.error('Vui lòng điền đầy đủ tên bước và số thứ tự');
      return;
    }

    setIsSubmittingStep(true);
    try {
      await api.post(`/workflows/${selectedWorkflow.id}/steps`, {
        step_name: stepName,
        order_number: Number(orderNumber),
        is_initial: isInitial,
        is_final: isFinal
      });
      toast.success('Thêm bước quy trình thành công!');
      setStepName('');
      setOrderNumber('');
      setIsInitial(false);
      setIsFinal(false);
      await fetchWorkflows();
    } catch (err) {
      toast.error('Lỗi khi thêm bước: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSubmittingStep(false);
    }
  };

  const handleAddTransition = async (e) => {
    e.preventDefault();
    if (!fromStepId || !toStepId || !transitionName) {
      toast.error('Vui lòng chọn bước đi, bước đến và nhập tên chuyển đổi');
      return;
    }

    setIsSubmittingTransition(true);
    try {
      await api.post(`/workflows/${selectedWorkflow.id}/transitions`, {
        from_step_id: Number(fromStepId),
        to_step_id: Number(toStepId),
        name: transitionName,
        role_allowed: allowedRoles.length > 0 ? allowedRoles.join(',') : null
      });
      toast.success('Thêm lượt chuyển dịch thành công!');
      setTransitionName('');
      setFromStepId('');
      setToStepId('');
      setAllowedRoles([]);
      await fetchWorkflows();
    } catch (err) {
      toast.error('Lỗi khi thêm lượt chuyển dịch: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSubmittingTransition(false);
    }
  };

  const handleRoleToggle = (role) => {
    if (allowedRoles.includes(role)) {
      setAllowedRoles(allowedRoles.filter(r => r !== role));
    } else {
      setAllowedRoles([...allowedRoles, role]);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cấu hình quy trình (Workflow Engine)"
        subtitle="Quản lý các trạng thái hợp lệ và quy tắc chuyển đổi trạng thái của hệ thống."
      />

      {isLoading && workflows.length === 0 ? (
        <div className="flex justify-center items-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Workflows List */}
          <div className="lg:col-span-1 space-y-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                Quy trình hệ thống
              </h3>
              <div className="space-y-2">
                {workflows.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => setSelectedWorkflow(w)}
                    className={`w-full text-left px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-between group ${
                      selectedWorkflow?.id === w.id
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <GitFork size={16} className={selectedWorkflow?.id === w.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'} />
                      <span>{w.name}</span>
                    </div>
                    <ChevronRight size={14} className={selectedWorkflow?.id === w.id ? 'text-white' : 'text-gray-400'} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Area - Workflow detail configuration */}
          {selectedWorkflow && (
            <div className="lg:col-span-3 space-y-6">
              {/* Header Info */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Settings size={20} className="animate-spin-slow" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      Cấu hình: {selectedWorkflow.name}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      ID: #{selectedWorkflow.id} | Tổng cộng: {selectedWorkflow.steps?.length || 0} bước, {selectedWorkflow.transitions?.length || 0} chuyển dịch trạng thái.
                    </p>
                  </div>
                </div>
              </div>

              {/* Steps Management & Add Step */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* List Steps */}
                <div className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-blue-600 rounded-full"></span>
                    Các trạng thái của quy trình (Steps)
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-400 uppercase">
                          <th className="py-2.5 px-3">Thứ tự</th>
                          <th className="py-2.5 px-3">Tên bước (Enum khớp)</th>
                          <th className="py-2.5 px-3">Trạng thái đặc biệt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm text-gray-700 dark:text-gray-300">
                        {selectedWorkflow.steps?.map((step) => (
                          <tr key={step.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                              #{step.order_number}
                            </td>
                            <td className="py-3 px-3">
                              <span className="bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded text-xs font-mono font-medium">
                                {step.step_name}
                              </span>
                            </td>
                            <td className="py-3 px-3 space-x-1.5">
                              {step.is_initial && (
                                <span className="bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 text-xs font-semibold px-2 py-0.5 rounded-full border border-green-200 dark:border-green-900/30">
                                  Bắt đầu (Initial)
                                </span>
                              )}
                              {step.is_final && (
                                <span className="bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 text-xs font-semibold px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-900/30">
                                  Kết thúc (Final)
                                </span>
                              )}
                              {!step.is_initial && !step.is_final && (
                                <span className="text-gray-400 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {(!selectedWorkflow.steps || selectedWorkflow.steps.length === 0) && (
                          <tr>
                            <td colSpan="3" className="py-8 text-center text-gray-400 text-xs">
                              Quy trình này chưa cấu hình các bước.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Add Step Form */}
                <div className="xl:col-span-1 bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
                    <PlusCircle size={18} className="text-blue-500" />
                    Thêm trạng thái mới
                  </h3>

                  <form onSubmit={handleAddStep} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                        Tên bước (Trạng thái)
                      </label>
                      <input
                        type="text"
                        value={stepName}
                        onChange={(e) => setStepName(e.target.value)}
                        placeholder="VD: IN_PROGRESS"
                        className="input"
                        required
                      />
                      <p className="text-[10px] text-gray-400 mt-1">
                        Phải khớp chính xác với giá trị trong DB Enum (ví dụ: PENDING, ACTIVE, RESOLVED).
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                        Số thứ tự (Order)
                      </label>
                      <input
                        type="number"
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value)}
                        placeholder="VD: 10"
                        className="input"
                        required
                      />
                    </div>

                    <div className="space-y-2 pt-2">
                      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isInitial}
                          onChange={(e) => setIsInitial(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span>Là trạng thái bắt đầu (Initial)</span>
                      </label>

                      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isFinal}
                          onChange={(e) => setIsFinal(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span>Là trạng thái kết thúc (Final)</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingStep}
                      className="w-full btn-primary flex items-center justify-center gap-1.5"
                    >
                      <Plus size={16} />
                      {isSubmittingStep ? 'Đang thêm...' : 'Thêm bước mới'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Transitions Management & Add Transition */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* List Transitions */}
                <div className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-purple-600 rounded-full"></span>
                    Quy tắc dịch chuyển trạng thái (Transitions)
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-400 uppercase">
                          <th className="py-2.5 px-3">Tên Transition</th>
                          <th className="py-2.5 px-3">Từ bước</th>
                          <th className="py-2.5 px-3">Đến bước</th>
                          <th className="py-2.5 px-3">Quyền thực hiện</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm text-gray-700 dark:text-gray-300">
                        {selectedWorkflow.transitions?.map((trans) => (
                          <tr key={trans.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="py-3 px-3 font-medium text-gray-900 dark:text-white">
                              {trans.name}
                            </td>
                            <td className="py-3 px-3">
                              <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-0.5 rounded text-xs font-mono">
                                {trans.from_step?.step_name}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="bg-blue-50 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400 px-2 py-0.5 rounded text-xs font-mono">
                                {trans.to_step?.step_name}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              {trans.role_allowed ? (
                                <div className="flex flex-wrap gap-1">
                                  {trans.role_allowed.split(',').map((role) => (
                                    <span key={role} className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 text-xs font-medium px-2 py-0.5 rounded border border-purple-100 dark:border-purple-900/30">
                                      <Shield size={10} />
                                      {ROLE_OPTIONS.find(o => o.value === role.trim())?.label || role}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">Mọi vai trò</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {(!selectedWorkflow.transitions || selectedWorkflow.transitions.length === 0) && (
                          <tr>
                            <td colSpan="4" className="py-8 text-center text-gray-400 text-xs">
                              Quy trình này chưa cấu hình các lượt chuyển đổi trạng thái hợp lệ.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Add Transition Form */}
                <div className="xl:col-span-1 bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
                    <PlusCircle size={18} className="text-purple-500" />
                    Thêm lượt chuyển đổi
                  </h3>

                  <form onSubmit={handleAddTransition} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                        Tên chuyển dịch
                      </label>
                      <input
                        type="text"
                        value={transitionName}
                        onChange={(e) => setTransitionName(e.target.value)}
                        placeholder="VD: Giao việc, Hoàn thành"
                        className="input"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                        Từ trạng thái
                      </label>
                      <select
                        value={fromStepId}
                        onChange={(e) => setFromStepId(e.target.value)}
                        className="input"
                        required
                      >
                        <option value="">-- Chọn bước bắt đầu --</option>
                        {selectedWorkflow.steps?.map(step => (
                          <option key={step.id} value={step.id}>
                            #{step.order_number} - {step.step_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                        Đến trạng thái
                      </label>
                      <select
                        value={toStepId}
                        onChange={(e) => setToStepId(e.target.value)}
                        className="input"
                        required
                      >
                        <option value="">-- Chọn bước tiếp theo --</option>
                        {selectedWorkflow.steps?.map(step => (
                          <option key={step.id} value={step.id}>
                            #{step.order_number} - {step.step_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
                        Vai trò được phép thực hiện
                      </label>
                      <div className="space-y-2 border border-gray-200 dark:border-gray-700 p-3 rounded-lg bg-gray-50/50 dark:bg-gray-900/10">
                        {ROLE_OPTIONS.map((option) => (
                          <label key={option.value} className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={allowedRoles.includes(option.value)}
                              onChange={() => handleRoleToggle(option.value)}
                              className="rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span>{option.label}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Nếu không chọn vai trò nào, mọi người dùng đều được phép thực hiện.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingTransition}
                      className="w-full btn-primary bg-purple-600 hover:bg-purple-700 flex items-center justify-center gap-1.5"
                    >
                      <Plus size={16} />
                      {isSubmittingTransition ? 'Đang thêm...' : 'Thêm lượt chuyển đổi'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
