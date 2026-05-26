// modules/auth/frontend/pages/UsersPage.jsx
import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, Edit2, Lock, Unlock, Info } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { DataTable } from '@/components/common/DataTable.jsx';
import { Modal } from '@/components/common/Modal.jsx';
import { FormField } from '@/components/forms/FormField.jsx';
import { ModalFooter } from '@/components/forms/ModalFooter.jsx';
import { ConfirmDialog } from '@/components/common/ConfirmDialog.jsx';
import { useUsers, useCreateUser, useUpdateUser, useToggleUserActive } from '../hooks/useAuth.js';
import { ROLE_LABELS } from '@/constants/roles.js';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

// ── Schemas ────────────────────────────────────────────────────────────────────
const createSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  full_name: z.string().min(1, 'Họ tên không được để trống'),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'TECHNICIAN', 'RECEPTIONIST'], {
    required_error: 'Chọn vai trò',
  }),
});

const editSchema = z.object({
  full_name: z.string().min(1, 'Họ tên không được để trống'),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'TECHNICIAN', 'RECEPTIONIST'], {
    required_error: 'Chọn vai trò',
  }),
});

// ── UserForm Component ─────────────────────────────────────────────────────────
function UserForm({ onClose, editUser }) {
  const isEdit = !!editUser;
  const schema = isEdit ? editSchema : createSchema;

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: editUser
      ? { full_name: editUser.full_name, phone: editUser.phone ?? '', role: editUser.role }
      : {},
  });

  const { mutate: create, isPending: creating } = useCreateUser({
    onSuccess: () => { toast.success('Tạo nhân viên thành công'); onClose(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Tạo thất bại'),
  });

  const { mutate: update, isPending: updating } = useUpdateUser(editUser?.id, {
    onSuccess: () => { toast.success('Cập nhật thành công'); onClose(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Cập nhật thất bại'),
  });

  const isPending = creating || updating;

  const onSubmit = (data) => {
    if (isEdit) update(data);
    else create(data);
  };

  return (
    <Modal title={isEdit ? 'Sửa thông tin nhân viên' : 'Thêm nhân viên mới'} onClose={onClose}>
      {!isEdit && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
          <Info size={15} className="text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700">
            Mật khẩu mặc định: <strong>password123</strong> — Nhân viên cần đổi sau khi đăng nhập lần đầu.
          </p>
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {!isEdit && (
          <FormField label="Email" required error={errors.email?.message}>
            <input {...register('email')} type="email" id="user-email" className="input" placeholder="email@example.com" />
          </FormField>
        )}

        <FormField label="Họ và tên" required error={errors.full_name?.message}>
          <input {...register('full_name')} id="user-full-name" className="input" placeholder="Nguyễn Văn A" />
        </FormField>

        <FormField label="Số điện thoại" error={errors.phone?.message}>
          <input {...register('phone')} id="user-phone" className="input" type="tel" placeholder="0xxxxxxxxx" />
        </FormField>

        <FormField label="Vai trò" required error={errors.role?.message}>
          <select {...register('role')} id="user-role" className="input">
            <option value="">-- Chọn vai trò --</option>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </FormField>

        <ModalFooter onCancel={onClose} isLoading={isPending} submitLabel={isEdit ? 'Lưu' : 'Tạo nhân viên'} />
      </form>
    </Modal>
  );
}

// ── UsersPage ──────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);

  const { data, isLoading } = useUsers();

  const { mutate: toggleActive, isPending: toggling } = useToggleUserActive({
    onSuccess: () => {
      toast.success('Cập nhật trạng thái thành công');
      setToggleTarget(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Thất bại'),
  });

  const handleEdit = useCallback((user) => {
    setEditUser(user);
    setIsFormOpen(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setIsFormOpen(false);
    setEditUser(null);
  }, []);

  const columns = [
    { key: 'full_name', label: 'Họ tên' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'SĐT', render: (row) => row.phone || '—' },
    {
      key: 'role',
      label: 'Vai trò',
      render: (row) => (
        <span className="badge bg-blue-50 text-blue-700">
          {ROLE_LABELS[row.role] ?? row.role}
        </span>
      ),
    },
    {
      key: 'is_active',
      label: 'Trạng thái',
      render: (row) =>
        row.is_active ? (
          <span className="badge bg-green-100 text-green-800">Hoạt động</span>
        ) : (
          <span className="badge bg-gray-100 text-gray-500">Đã khoá</span>
        ),
    },
    {
      key: 'last_login_at',
      label: 'Đăng nhập cuối',
      render: (row) =>
        row.last_login_at
          ? format(parseISO(row.last_login_at), 'dd/MM/yyyy HH:mm', { locale: vi })
          : '—',
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="btn-ghost py-1 px-2 text-xs"
            id={`edit-user-${row.id}`}
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => setToggleTarget(row)}
            className={`btn-ghost py-1 px-2 text-xs ${row.is_active ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
            id={`toggle-user-${row.id}`}
            title={row.is_active ? 'Khoá tài khoản' : 'Mở khoá'}
          >
            {row.is_active ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
        </div>
      ),
    },
  ];

  const users = Array.isArray(data) ? data : (data?.items ?? []);

  return (
    <div>
      <PageHeader
        title="Quản lý nhân viên"
        subtitle={`${users.length} nhân viên`}
        action={
          <button onClick={() => setIsFormOpen(true)} className="btn-primary" id="add-user-btn">
            <Plus size={16} />
            Thêm nhân viên
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={users}
        total={users.length}
        page={1}
        isLoading={isLoading}
        emptyMessage="Chưa có nhân viên nào"
      />

      {isFormOpen && (
        <UserForm onClose={handleCloseForm} editUser={editUser} />
      )}

      {toggleTarget && (
        <ConfirmDialog
          title={toggleTarget.is_active ? 'Khoá tài khoản' : 'Mở khoá tài khoản'}
          message={
            toggleTarget.is_active
              ? `Bạn có chắc muốn khoá tài khoản của "${toggleTarget.full_name}"? Họ sẽ không thể đăng nhập.`
              : `Mở khoá tài khoản của "${toggleTarget.full_name}"?`
          }
          confirmText={toggleTarget.is_active ? 'Khoá tài khoản' : 'Mở khoá'}
          confirmVariant={toggleTarget.is_active ? 'danger' : 'primary'}
          isLoading={toggling}
          onConfirm={() => toggleActive(toggleTarget.id)}
          onCancel={() => setToggleTarget(null)}
        />
      )}
    </div>
  );
}
