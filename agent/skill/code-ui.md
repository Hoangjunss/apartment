# Skill: code-ui

Dùng skill này khi được yêu cầu viết **React component, page, hoặc layout** cho bất kỳ module nào.

---

## Quy trình bắt buộc trước khi viết

1. Đọc `DESIGN.md` → tìm section trang cần viết, nắm API nào được dùng
2. Đọc `rbac-rule.md` → xác định role nào có quyền gì trên trang đó
3. Đọc `frontend-rule.md` → áp dụng template và quy ước
4. Đặt file đúng path: `modules/<module>/frontend/pages/` hoặc `components/`

---

## Common Components — Phải tạo trước

Các component dùng chung đặt tại `apps/frontend/src/components/`:

### AppLayout.jsx
```jsx
// Wrapper cho tất cả trang sau khi login
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.jsx';
import { Navbar } from './Navbar.jsx';

export function AppLayout() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

### PageHeader.jsx
```jsx
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PageHeader({ title, subtitle, backUrl, action }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {backUrl && (
          <button
            onClick={() => navigate(backUrl)}
            className="p-1 rounded hover:bg-gray-200 transition"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
```

### StatusBadge.jsx
```jsx
import { APARTMENT_STATUS_CONFIG, CONTRACT_STATUS_CONFIG } from '@/constants/status.js';

export function ApartmentStatusBadge({ status }) {
  const config = APARTMENT_STATUS_CONFIG[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

export function ContractStatusBadge({ status, daysLeft }) {
  const config = CONTRACT_STATUS_CONFIG[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
      {status === 'EXPIRING_SOON' && daysLeft != null && (
        <span>({daysLeft} ngày)</span>
      )}
    </span>
  );
}
```

### DataTable.jsx
```jsx
export function DataTable({ columns, data, total, page, limit = 20, onPageChange, isLoading, emptyMessage = 'Không có dữ liệu' }) {
  const totalPages = Math.ceil(total / limit);

  if (isLoading) return <TableSkeleton />;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {columns.map(col => (
                <th key={col.key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr key={row.id ?? i} className="hover:bg-gray-50 transition">
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3 text-gray-700">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <span className="text-sm text-gray-500">
            Tổng: {total} kết quả
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1 text-sm rounded border disabled:opacity-40 hover:bg-gray-100"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => Math.abs(p - page) <= 2)
              .map(p => (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`px-3 py-1 text-sm rounded border ${
                    p === page ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-100'
                  }`}
                >
                  {p}
                </button>
              ))}
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 text-sm rounded border disabled:opacity-40 hover:bg-gray-100"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Modal.jsx
```jsx
import { useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({ title, onClose, children, size = 'md' }) {
  // Đóng khi nhấn Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const sizeClass = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* Modal box */}
      <div className={`relative bg-white rounded-xl shadow-xl w-full ${sizeClass} mx-4 max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
```

### ConfirmDialog.jsx
```jsx
import { Modal } from './Modal.jsx';
import { AlertTriangle } from 'lucide-react';

export function ConfirmDialog({ title, message, onConfirm, onCancel, confirmText = 'Xác nhận', isLoading }) {
  return (
    <Modal title={title} onClose={onCancel} size="sm">
      <div className="flex gap-3 mb-5">
        <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
        <p className="text-gray-600">{message}</p>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">
          Hủy
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60"
        >
          {isLoading ? 'Đang xử lý...' : confirmText}
        </button>
      </div>
    </Modal>
  );
}
```

---

## Constants — Status Config

```js
// src/constants/status.js
export const APARTMENT_STATUS_CONFIG = {
  AVAILABLE:   { label: 'Còn trống',   className: 'bg-green-100 text-green-800' },
  OCCUPIED:    { label: 'Đang thuê',   className: 'bg-blue-100 text-blue-800' },
  MAINTENANCE: { label: 'Bảo trì',     className: 'bg-yellow-100 text-yellow-800' },
  RESERVED:    { label: 'Đã đặt cọc', className: 'bg-purple-100 text-purple-800' },
};

export const CONTRACT_STATUS_CONFIG = {
  ACTIVE:        { label: 'Hiệu lực',      className: 'bg-green-100 text-green-800' },
  EXPIRING_SOON: { label: 'Sắp hết hạn',  className: 'bg-orange-100 text-orange-800' },
  EXPIRED:       { label: 'Hết hạn',       className: 'bg-gray-100 text-gray-600' },
  TERMINATED:    { label: 'Chấm dứt',      className: 'bg-red-100 text-red-800' },
};

export const ROOM_TYPE_LABELS = {
  STUDIO:   'Studio',
  ONE_BR:   '1 Phòng ngủ',
  TWO_BR:   '2 Phòng ngủ',
  THREE_BR: '3 Phòng ngủ',
};

export const FURNITURE_CONDITION_LABELS = {
  NEW:  'Mới',
  GOOD: 'Tốt',
  WORN: 'Cũ',
};

export const GENDER_LABELS = {
  MALE:   'Nam',
  FEMALE: 'Nữ',
  OTHER:  'Khác',
};
```

---

## State Machine — Apartment Status (dùng trên UI)

```js
// Hiển thị đúng options dropdown khi đổi trạng thái
export const VALID_TRANSITIONS = {
  AVAILABLE:   ['OCCUPIED', 'RESERVED', 'MAINTENANCE'],
  OCCUPIED:    ['AVAILABLE'],
  MAINTENANCE: ['AVAILABLE'],
  RESERVED:    ['AVAILABLE', 'OCCUPIED'],
};

// Trong component:
const allowedNext = VALID_TRANSITIONS[apartment.status] ?? [];
// Chỉ render options nằm trong allowedNext
```

---

## Sidebar Navigation

```jsx
// Sidebar.jsx — ví dụ hoàn chỉnh
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Building2, Home, Users, FileText, UserCog } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { ALL_ROLES, MANAGEMENT_ROLES, TENANT_ACCESS_ROLES, CONTRACT_VIEW_ROLES, ROLES } from '@/constants/roles.js';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ALL_ROLES },
  { to: '/buildings', label: 'Tòa nhà',  icon: Building2,       roles: ALL_ROLES },
  { to: '/apartments', label: 'Căn hộ',  icon: Home,            roles: ALL_ROLES },
  { to: '/tenants',   label: 'Khách thuê', icon: Users,          roles: TENANT_ACCESS_ROLES },
  { to: '/contracts', label: 'Hợp đồng', icon: FileText,         roles: CONTRACT_VIEW_ROLES },
  { to: '/users',     label: 'Nhân viên', icon: UserCog,         roles: [ROLES.ADMIN] },
];

export function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-4 border-b">
        <span className="font-bold text-lg text-blue-700">QLCHDC</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS
          .filter(item => item.roles.includes(user?.role))
          .map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition
                ${isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))
        }
      </nav>
    </aside>
  );
}
```

---

## App.jsx — Router Config

```jsx
// apps/frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient.js';
import { AuthProvider } from '@/contexts/AuthContext.jsx';
import { AppLayout } from '@/components/layout/AppLayout.jsx';
import { ProtectedRoute } from '@/components/common/ProtectedRoute.jsx';
import { ROLES, MANAGEMENT_ROLES, TENANT_ACCESS_ROLES, CONTRACT_VIEW_ROLES } from '@/constants/roles.js';

// Pages
import LoginPage from 'modules/auth/frontend/pages/LoginPage.jsx';
import DashboardPage from 'modules/auth/frontend/pages/DashboardPage.jsx';
import BuildingsPage from 'modules/building/frontend/pages/BuildingsPage.jsx';
import BuildingDetailPage from 'modules/building/frontend/pages/BuildingDetailPage.jsx';
import ApartmentsPage from 'modules/building/frontend/pages/ApartmentsPage.jsx';
import ApartmentDetailPage from 'modules/building/frontend/pages/ApartmentDetailPage.jsx';
import TenantsPage from 'modules/tenant/frontend/pages/TenantsPage.jsx';
import TenantDetailPage from 'modules/tenant/frontend/pages/TenantDetailPage.jsx';
import TenantFormPage from 'modules/tenant/frontend/pages/TenantFormPage.jsx';
import ContractsPage from 'modules/contract/frontend/pages/ContractsPage.jsx';
import ContractDetailPage from 'modules/contract/frontend/pages/ContractDetailPage.jsx';
import ContractFormPage from 'modules/contract/frontend/pages/ContractFormPage.jsx';
import UsersPage from 'modules/auth/frontend/pages/UsersPage.jsx';
import ProfilePage from 'modules/auth/frontend/pages/ProfilePage.jsx';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected — dùng AppLayout */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />

              {/* Building */}
              <Route path="/buildings" element={<BuildingsPage />} />
              <Route path="/buildings/:id" element={<BuildingDetailPage />} />
              <Route path="/apartments" element={<ApartmentsPage />} />
              <Route path="/apartments/:id" element={<ApartmentDetailPage />} />

              {/* Tenant */}
              <Route path="/tenants" element={
                <ProtectedRoute roles={TENANT_ACCESS_ROLES}><TenantsPage /></ProtectedRoute>
              } />
              <Route path="/tenants/new" element={
                <ProtectedRoute roles={TENANT_ACCESS_ROLES}><TenantFormPage /></ProtectedRoute>
              } />
              <Route path="/tenants/:id" element={
                <ProtectedRoute roles={TENANT_ACCESS_ROLES}><TenantDetailPage /></ProtectedRoute>
              } />

              {/* Contract */}
              <Route path="/contracts" element={
                <ProtectedRoute roles={CONTRACT_VIEW_ROLES}><ContractsPage /></ProtectedRoute>
              } />
              <Route path="/contracts/new" element={
                <ProtectedRoute roles={MANAGEMENT_ROLES}><ContractFormPage /></ProtectedRoute>
              } />
              <Route path="/contracts/:id" element={
                <ProtectedRoute roles={CONTRACT_VIEW_ROLES}><ContractDetailPage /></ProtectedRoute>
              } />

              {/* Users — ADMIN only */}
              <Route path="/users" element={
                <ProtectedRoute roles={[ROLES.ADMIN]}><UsersPage /></ProtectedRoute>
              } />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

---

## Checklist khi viết Component

- [ ] File đặt đúng path (page / component / hook / service)
- [ ] Export đúng (default cho page, named cho component)
- [ ] Dùng `useParams()` lấy `:id`, parse về number trước khi gọi API
- [ ] Render `<LoadingSpinner />` khi `isLoading`
- [ ] Render error message khi `isError`
- [ ] RoleGuard bọc mọi action nhạy cảm
- [ ] Date format theo `dd/MM/yyyy` tiếng Việt
- [ ] Số tiền format qua `formatCurrency()`
