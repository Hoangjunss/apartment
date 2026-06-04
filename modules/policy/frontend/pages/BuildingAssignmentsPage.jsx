// modules/policy/frontend/pages/BuildingAssignmentsPage.jsx
import { useState, useEffect } from 'react';
import { api } from '@/lib/axios.js';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { ShieldAlert, Plus, ShieldOff, Check, X, Shield, Users } from 'lucide-react';
import { Modal } from '@/components/common/Modal.jsx';
import { FormField } from '@/components/forms/FormField.jsx';
import { ModalFooter } from '@/components/forms/ModalFooter.jsx';
import { useBuildings } from 'modules/building/frontend/hooks/useBuilding.js';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ROLE_LABELS } from '@/constants/roles.js';

export default function BuildingAssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form Fields
  const [userId, setUserId] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch buildings using existing hook
  const { data: buildingsData } = useBuildings({ limit: 100 });
  const buildings = buildingsData?.items ?? [];

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [assignRes, usersRes] = await Promise.all([
        api.get('/policy/assignments'),
        api.get('/auth/users?limit=1000')
      ]);
      setAssignments(assignRes.data.data || []);
      
      // Filter users to only allow MANAGER, TECHNICIAN, RECEPTIONIST
      const allUsers = usersRes.data.data?.items || [];
      const staffUsers = allUsers.filter(u => ['MANAGER', 'TECHNICIAN', 'RECEPTIONIST'].includes(u.role) && u.is_active);
      setUsers(staffUsers);
    } catch (err) {
      toast.error('Không thể tải dữ liệu phân quyền: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = () => {
    setUserId('');
    setBuildingId('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId || !buildingId) {
      toast.error('Vui lòng chọn nhân viên và tòa nhà');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/policy/assignments', {
        user_id: Number(userId),
        building_id: Number(buildingId)
      });
      toast.success('Phân công quản lý tòa nhà thành công!');
      setIsModalOpen(false);
      await fetchData();
    } catch (err) {
      toast.error('Lỗi khi phân công: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (assignmentId, userName, buildingName) => {
    if (!window.confirm(`Bạn có chắc muốn thu hồi quyền quản lý của "${userName}" tại tòa nhà "${buildingName}"?`)) {
      return;
    }

    try {
      await api.patch(`/policy/assignments/${assignmentId}/revoke`);
      toast.success('Đã thu hồi phân công quản lý tòa nhà thành công!');
      await fetchData();
    } catch (err) {
      toast.error('Lỗi khi thu hồi phân công: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Phân quyền & Phân công tòa nhà"
        subtitle="Quản lý việc phân công tòa nhà cho Manager, Technician, Receptionist. Lưu trữ lịch sử thu hồi quyền."
        action={
          <button
            onClick={handleOpenModal}
            className="btn-primary flex items-center gap-1.5"
            id="assign-building-btn"
          >
            <Plus size={16} />
            Phân công quản lý
          </button>
        }
      />

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-400 mb-4">
              <ShieldOff size={32} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Chưa có phân công nào
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4">
              Bắt đầu phân công các tòa nhà cho nhân viên quản lý hoặc bảo trì để giới hạn phạm vi truy cập dữ liệu của họ.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/10 text-xs font-semibold text-gray-400 uppercase">
                  <th className="py-3 px-4">Nhân viên</th>
                  <th className="py-3 px-4">Tòa nhà</th>
                  <th className="py-3 px-4">Thời gian phân công</th>
                  <th className="py-3 px-4">Người phân công</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm text-gray-700 dark:text-gray-300">
                {assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                          {a.user?.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {a.user?.full_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {a.user?.email} • <span className="text-purple-600 dark:text-purple-400 font-medium">{ROLE_LABELS[a.user?.role] || a.user?.role}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-medium text-gray-900 dark:text-white">
                      <span className="bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 px-2.5 py-1 rounded text-xs font-mono font-bold">
                        {a.building?.code}
                      </span>{' '}
                      {a.building?.name}
                    </td>
                    <td className="py-4 px-4 text-xs text-gray-500 dark:text-gray-400">
                      {a.assigned_at
                        ? format(parseISO(a.assigned_at), 'dd/MM/yyyy HH:mm', { locale: vi })
                        : '—'}
                    </td>
                    <td className="py-4 px-4 text-xs font-medium">
                      {a.assigner?.full_name || `ID #${a.assigned_by}`}
                    </td>
                    <td className="py-4 px-4">
                      {a.revoked_at ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 text-xs font-semibold px-2 py-0.5 rounded border border-red-100 dark:border-red-900/30">
                            <X size={10} />
                            Đã thu hồi (Revoked)
                          </span>
                          <p className="text-[10px] text-gray-400">
                            Thu hồi lúc: {format(parseISO(a.revoked_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                          </p>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-green-200 dark:border-green-900/30">
                          <Check size={12} />
                          Hoạt động (Active)
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      {!a.revoked_at && (
                        <button
                          onClick={() => handleRevoke(a.id, a.user?.full_name, a.building?.name)}
                          className="btn-ghost text-red-500 hover:text-red-700 hover:bg-red-50 py-1 px-2 text-xs flex items-center gap-1"
                          id={`revoke-assignment-${a.id}`}
                        >
                          <ShieldOff size={14} />
                          Thu hồi
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add Assignment */}
      {isModalOpen && (
        <Modal title="Phân công quản lý tòa nhà" onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Nhân viên" required>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="input"
                required
              >
                <option value="">-- Chọn nhân viên (Manager/Tech/Receptionist) --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({ROLE_LABELS[u.role] || u.role}) — {u.email}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Tòa nhà phân công" required>
              <select
                value={buildingId}
                onChange={(e) => setBuildingId(e.target.value)}
                className="input"
                required
              >
                <option value="">-- Chọn tòa nhà --</option>
                {buildings.map(b => (
                  <option key={b.id} value={b.id}>
                    [{b.code}] {b.name}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <ShieldAlert size={15} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700">
                Sau khi phân công, nhân viên được chọn sẽ chỉ được xem và quản lý các dữ liệu (Căn hộ, Hợp đồng, Hóa đơn, Sự cố) thuộc tòa nhà này.
              </p>
            </div>

            <ModalFooter
              onCancel={() => setIsModalOpen(false)}
              isLoading={isSubmitting}
              submitLabel="Lưu phân công"
            />
          </form>
        </Modal>
      )}
    </div>
  );
}
