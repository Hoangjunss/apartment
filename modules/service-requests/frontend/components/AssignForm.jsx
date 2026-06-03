// modules/service-requests/frontend/components/AssignForm.jsx
import { useState } from 'react';
import { Modal } from '@/components/common/Modal.jsx';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios.js';

export function AssignForm({ request, onClose, onSubmit }) {
  const [selectedUserId, setSelectedUserId] = useState('');

  const { data: usersData } = useQuery({
    queryKey: ['users', 'technicians'],
    queryFn: () => api.get('/auth/users', { params: { limit: 100 } }).then(r => r.data.data ?? {}),
  });
  const technicians = (usersData?.items ?? []).filter(u => u.role === 'TECHNICIAN' && u.is_active);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedUserId) return;
    onSubmit(Number(selectedUserId));
  };

  return (
    <Modal title={`Phân công: "${request.title}"`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="form-label">Chọn kỹ thuật viên</label>
          <select
            className="form-input"
            value={selectedUserId}
            onChange={e => setSelectedUserId(e.target.value)}
            required
          >
            <option value="">— Chọn nhân viên —</option>
            {technicians.map(u => (
              <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Huỷ</button>
          <button type="submit" disabled={!selectedUserId} className="btn-primary">
            Xác nhận phân công
          </button>
        </div>
      </form>
    </Modal>
  );
}
