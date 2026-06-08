// modules/policy/frontend/pages/BuildingAssignmentsPage.jsx
import { useState, useEffect } from 'react';
import { api } from '@/lib/axios.js';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { ShieldAlert, Plus, ShieldOff, Check, X, RotateCcw } from 'lucide-react';
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

  // Filters State
  const [filterBuildingId, setFilterBuildingId] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'revoked'
  const [filterRole, setFilterRole] = useState('');

  // Form Fields State
  const [userId, setUserId] = useState('');
  const [selectedBuildingIds, setSelectedBuildingIds] = useState([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Revocation State
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [revokingAssignment, setRevokingAssignment] = useState(null);
  const [revokeNotes, setRevokeNotes] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);

  // Expanded State for Revoked Assignments History
  const [expandedUsers, setExpandedUsers] = useState({});

  const toggleExpandUser = (userId) => {
    setExpandedUsers(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

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

  const handleOpenModal = (preSelectedUserId = '') => {
    setUserId(preSelectedUserId);
    setSelectedBuildingIds([]);
    setNotes('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId || selectedBuildingIds.length === 0) {
      toast.error('Vui lòng chọn nhân viên và ít nhất một tòa nhà');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/policy/assignments', {
        user_id: Number(userId),
        building_ids: selectedBuildingIds.map(Number),
        notes: notes
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

  const startRevoke = (assignment) => {
    setRevokingAssignment(assignment);
    setRevokeNotes('');
    setRevokeModalOpen(true);
  };

  const handleRevokeSubmit = async (e) => {
    e.preventDefault();
    if (!revokingAssignment) return;

    setIsRevoking(true);
    try {
      await api.patch(`/policy/assignments/${revokingAssignment.id}/revoke`, {
        notes: revokeNotes
      });
      toast.success('Đã thu hồi phân công quản lý tòa nhà thành công!');
      setRevokeModalOpen(false);
      setRevokingAssignment(null);
      await fetchData();
    } catch (err) {
      toast.error('Lỗi khi thu hồi phân công: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsRevoking(false);
    }
  };

  const handleClearFilters = () => {
    setFilterBuildingId('');
    setFilterStatus('all');
    setFilterRole('');
  };

  const hasActiveFilters = filterBuildingId || filterStatus !== 'all' || filterRole;

  // Build userId -> user & assignments mapping
  const userMap = {};

  // Fill in active staff list
  users.forEach(u => {
    userMap[u.id] = {
      user: u,
      assignments: []
    };
  });

  // Attach assignments
  assignments.forEach(a => {
    if (!a.user) return;
    const uid = a.user.id;
    if (!userMap[uid]) {
      userMap[uid] = {
        user: a.user,
        assignments: []
      };
    }
    userMap[uid].assignments.push(a);
  });

  // Filter the mapped users and their assignments
  const filteredGrouped = Object.values(userMap)
    .map(item => {
      // Filter assignments
      const filteredAssignments = item.assignments.filter(a => {
        if (filterBuildingId && String(a.building_id) !== String(filterBuildingId)) {
          return false;
        }
        if (filterStatus === 'active' && a.revoked_at) {
          return false;
        }
        if (filterStatus === 'revoked' && !a.revoked_at) {
          return false;
        }
        return true;
      });

      return {
        ...item,
        filteredAssignments
      };
    })
    .filter(item => {
      // Filter user by role
      if (filterRole && item.user.role !== filterRole) {
        return false;
      }
      // If building/status filters are active, only show users with matching assignments
      if ((filterBuildingId || filterStatus !== 'all') && item.filteredAssignments.length === 0) {
        return false;
      }
      return true;
    });

  const activeAssignmentsForSelectedUser = userId
    ? (userMap[userId]?.assignments || []).filter(a => !a.revoked_at)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Phân quyền & Phân công tòa nhà"
        subtitle="Quản lý việc phân công tòa nhà cho Manager, Technician, Receptionist. Lưu trữ lịch sử thu hồi quyền."
        action={
          <button
            onClick={() => handleOpenModal('')}
            className="btn-primary flex items-center gap-1.5"
            id="assign-building-btn"
          >
            <Plus size={16} />
            Phân công quản lý
          </button>
        }
      />

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-4 items-center bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="w-full sm:w-48">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            Lọc theo Tòa nhà
          </label>
          <select
            value={filterBuildingId}
            onChange={(e) => setFilterBuildingId(e.target.value)}
            className="input w-full text-xs"
            id="filter-building-select"
          >
            <option value="">Tất cả tòa nhà</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                [{b.code}] {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-48">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            Trạng thái phân công
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input w-full text-xs"
            id="filter-status-select"
          >
            <option value="all">Tất cả</option>
            <option value="active">Đang hoạt động (Active)</option>
            <option value="revoked">Đã thu hồi (Revoked)</option>
          </select>
        </div>

        <div className="w-full sm:w-48">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            Vai trò nhân viên
          </label>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="input w-full text-xs"
            id="filter-role-select"
          >
            <option value="">Tất cả vai trò</option>
            <option value="MANAGER">Quản lý (Manager)</option>
            <option value="TECHNICIAN">Kỹ thuật (Technician)</option>
            <option value="RECEPTIONIST">Lễ tân (Receptionist)</option>
          </select>
        </div>

        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="btn-ghost text-red-500 hover:text-red-600 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition px-4 py-2 mt-5 text-sm rounded-lg flex items-center gap-1.5"
            id="clear-filters-btn"
          >
            <RotateCcw size={14} />
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Main Content Grid/Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredGrouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-400 mb-4">
              <ShieldOff size={32} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Không tìm thấy nhân viên hoặc phân công nào
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4">
              Hãy thử thay đổi bộ lọc hoặc thêm phân công quản lý mới.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/10 text-xs font-semibold text-gray-400 uppercase">
                  <th className="py-3 px-4 w-1/4">Nhân viên</th>
                  <th className="py-3 px-4 w-1/3">Quyền hoạt động (Active)</th>
                  <th className="py-3 px-4 w-1/3">Lịch sử thu hồi (Revoked)</th>
                  <th className="py-3 px-4 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm text-gray-700 dark:text-gray-300">
                {filteredGrouped.map(({ user, filteredAssignments }) => {
                  const activeAssigns = filteredAssignments.filter(a => !a.revoked_at);
                  const revokedAssigns = filteredAssignments.filter(a => a.revoked_at);

                  return (
                    <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors align-top">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                            {user.full_name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white leading-snug">
                              {user.full_name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-normal">
                              {user.email}
                            </p>
                            <p className="text-[11px] font-medium text-purple-600 dark:text-purple-400 mt-0.5">
                              {ROLE_LABELS[user.role] || user.role}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-normal">
                        {activeAssigns.length === 0 ? (
                          <span className="text-xs text-gray-400 dark:text-gray-500 italic">Chưa phân công</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {activeAssigns.map((a) => (
                              <span
                                key={a.id}
                                className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/30 px-2.5 py-1 rounded-lg text-xs font-medium"
                                title={`Người gán: ${a.assigner?.full_name || 'Hệ thống'}
Thời gian gán: ${a.assigned_at ? format(parseISO(a.assigned_at), 'dd/MM/yyyy HH:mm', { locale: vi }) : ''}
Ghi chú: ${a.notes || 'Không có ghi chú'}`}
                              >
                                <span className="font-mono font-bold bg-green-100 dark:bg-green-900/40 px-1 py-0.5 rounded text-[10px]">
                                  {a.building?.code}
                                </span>
                                <span>{a.building?.name}</span>
                                <button
                                  onClick={() => startRevoke(a)}
                                  className="text-green-500 hover:text-red-600 transition-colors p-0.5 rounded-full hover:bg-green-100 dark:hover:bg-green-900/40 ml-0.5"
                                  title="Thu hồi quyền"
                                  id={`revoke-badge-${a.id}`}
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {revokedAssigns.length === 0 ? (
                          <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-2 items-center">
                            {(expandedUsers[user.id] ? revokedAssigns : revokedAssigns.slice(0, 2)).map((a) => (
                              <span
                                key={a.id}
                                className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-150 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30 px-2 py-0.5 rounded-lg text-xs font-medium cursor-help"
                                title={`Người phân công: ${a.assigner?.full_name || 'Hệ thống'}
Thời gian gán: ${a.assigned_at ? format(parseISO(a.assigned_at), 'dd/MM/yyyy HH:mm', { locale: vi }) : ''}
Thời gian thu hồi: ${a.revoked_at ? format(parseISO(a.revoked_at), 'dd/MM/yyyy HH:mm', { locale: vi }) : ''}
Ghi chú lịch sử: ${a.notes || 'Không có ghi chú'}`}
                              >
                                <span className="font-mono font-bold bg-red-100 dark:bg-red-900/40 px-1 py-0.5 rounded text-[10px]">
                                  {a.building?.code}
                                </span>
                                <span className="line-through opacity-75">{a.building?.name}</span>
                                {a.revoked_at && (
                                  <span className="text-[10px] text-red-500 font-semibold opacity-80">
                                    ({format(parseISO(a.revoked_at), 'dd/MM', { locale: vi })})
                                  </span>
                                )}
                              </span>
                            ))}
                            {revokedAssigns.length > 2 && (
                              <button
                                onClick={() => toggleExpandUser(user.id)}
                                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold ml-0.5 hover:underline transition-colors focus:outline-none"
                              >
                                {expandedUsers[user.id] ? 'Thu gọn' : `+${revokedAssigns.length - 2} xem thêm`}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => handleOpenModal(user.id)}
                          className="btn-ghost hover:bg-blue-50 hover:text-blue-600 text-slate-500 py-1.5 px-3 text-xs font-semibold rounded-lg flex items-center gap-1 inline-flex"
                          id={`assign-to-user-${user.id}`}
                        >
                          <Plus size={14} />
                          Phân công
                        </button>
                      </td>
                    </tr>
                  );
                })}
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

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Chọn tòa nhà phân công <span className="text-red-500">*</span>
              </label>
              
              {buildings.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 italic">Không có dữ liệu tòa nhà</p>
              ) : (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-48 overflow-y-auto p-2.5 space-y-2.5 bg-slate-50/50 dark:bg-slate-900/50">
                  {buildings.map(b => {
                    const isAlreadyAssigned = activeAssignmentsForSelectedUser.some(a => a.building_id === b.id);
                    return (
                      <label 
                        key={b.id} 
                        className={`flex items-center gap-2.5 p-2 rounded-md hover:bg-white dark:hover:bg-gray-800 border border-transparent hover:border-gray-100 dark:hover:border-gray-750 transition cursor-pointer select-none ${isAlreadyAssigned ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedBuildingIds.includes(b.id)}
                          disabled={isAlreadyAssigned}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBuildingIds([...selectedBuildingIds, b.id]);
                            } else {
                              setSelectedBuildingIds(selectedBuildingIds.filter(id => id !== b.id));
                            }
                          }}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 px-1.5 py-0.5 rounded">
                          {b.code}
                        </span>
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                          {b.name}
                          {isAlreadyAssigned && <span className="text-xs text-gray-400 dark:text-gray-500 ml-1.5 italic">(Đang quản lý)</span>}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <FormField label="Ghi chú phân công (Không bắt buộc)">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Nhập lý do hoặc thông tin phân công..."
                className="input w-full h-20 resize-none"
              />
            </FormField>

            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-lg">
              <ShieldAlert size={16} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-normal">
                Nhân viên sẽ được quyền truy cập toàn bộ dữ liệu (căn hộ, hợp đồng, hóa đơn, sự cố) thuộc (các) tòa nhà được chọn.
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

      {/* Modal Revoke Assignment */}
      {revokeModalOpen && revokingAssignment && (
        <Modal title="Thu hồi quyền quản lý tòa nhà" onClose={() => setRevokeModalOpen(false)}>
          <form onSubmit={handleRevokeSubmit} className="space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Bạn có chắc chắn muốn thu hồi quyền quản lý của nhân viên <strong className="text-gray-900 dark:text-white">{revokingAssignment.user?.full_name}</strong> tại tòa nhà <strong className="text-gray-900 dark:text-white">[{revokingAssignment.building?.code}] {revokingAssignment.building?.name}</strong> không?
            </p>

            <FormField label="Lý do thu hồi (Không bắt buộc)">
              <textarea
                value={revokeNotes}
                onChange={(e) => setRevokeNotes(e.target.value)}
                placeholder="Nhập lý do thu hồi (ví dụ: chuyển công tác, phân công lại...)"
                className="input w-full h-20 resize-none animate-fade-in"
              />
            </FormField>

            <ModalFooter
              onCancel={() => setRevokeModalOpen(false)}
              isLoading={isRevoking}
              submitLabel="Xác nhận thu hồi"
              submitVariant="danger"
            />
          </form>
        </Modal>
      )}
    </div>
  );
}
