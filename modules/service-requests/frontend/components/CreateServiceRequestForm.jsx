// modules/service-requests/frontend/components/CreateServiceRequestForm.jsx
import { useState } from 'react';
import { Modal } from '@/components/common/Modal.jsx';
import { useCreateServiceRequest } from '../hooks/useServiceRequests.js';
import toast from 'react-hot-toast';
import { api } from '@/lib/axios.js';
import { useQuery } from '@tanstack/react-query';

export function CreateServiceRequestForm({ onClose }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [apartmentId, setApartmentId] = useState('');

  const { data: aptsData } = useQuery({
    queryKey: ['apartments', 'simple'],
    queryFn: () => api.get('/building/apartments').then(r => r.data.data?.items ?? r.data.data ?? []),
    staleTime: 1000 * 60 * 5,
  });
  const apartments = Array.isArray(aptsData) ? aptsData : [];

  const { mutate: create, isPending } = useCreateServiceRequest({
    onSuccess: () => {
      toast.success('Tạo yêu cầu thành công!');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Tạo thất bại'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }
    create({
      title: title.trim(),
      description: description.trim(),
      apartment_id: apartmentId || null,
    });
  };

  return (
    <Modal title="Tạo yêu cầu kỹ thuật mới" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="form-label">Tiêu đề <span className="text-red-500">*</span></label>
          <input
            className="form-input"
            placeholder="VD: Điều hòa phòng A101 không mát"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="form-label">Căn hộ liên quan (nếu có)</label>
          <select
            className="form-input"
            value={apartmentId}
            onChange={e => setApartmentId(e.target.value)}
          >
            <option value="">— Không chọn —</option>
            {apartments.map(apt => (
              <option key={apt.id} value={apt.id}>
                {apt.apartment_code} — {apt.floor?.building?.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label">Mô tả chi tiết <span className="text-red-500">*</span></label>
          <textarea
            className="form-input min-h-[100px] resize-y"
            placeholder="Mô tả vấn đề cần xử lý..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Huỷ</button>
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? 'Đang tạo...' : 'Tạo yêu cầu'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
