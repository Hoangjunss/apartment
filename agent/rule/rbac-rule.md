# Rule: rbac-rule

> Quy tắc kiểm soát hiển thị UI theo Role (RBAC) cho Frontend QLCHDC.

---

## Nguyên tắc cốt lõi

1. **HIDE, không DISABLE** — Không render nút/section nếu không đủ role. Không dùng `disabled` để ẩn chức năng.
2. **Frontend là UX, Backend là bảo mật** — Frontend ẩn UI là trải nghiệm. Backend enforce role mới là bảo mật thực sự.
3. **Không render route** — Route cần quyền phải dùng `ProtectedRoute` + kiểm tra role, redirect về `/dashboard` nếu không đủ.

---

## Bảng quyền chi tiết

### Buildings & Apartments

| Hành động | ADMIN | MANAGER | TECHNICIAN | RECEPTIONIST |
|-----------|:-----:|:-------:|:----------:|:------------:|
| Xem danh sách tòa nhà | ✅ | ✅ | ✅ | ✅ |
| Xem chi tiết tòa nhà | ✅ | ✅ | ✅ | ✅ |
| Tạo tòa nhà mới | ✅ | ❌ | ❌ | ❌ |
| Sửa thông tin tòa nhà | ✅ | ✅ | ❌ | ❌ |
| Tạo tầng (bulk) | ✅ | ✅ | ❌ | ❌ |
| Xem danh sách căn hộ | ✅ | ✅ | ✅ | ✅ |
| Xem chi tiết căn hộ | ✅ | ✅ | ✅ | ✅ |
| Tạo căn hộ mới | ✅ | ✅ | ❌ | ❌ |
| Sửa thông tin căn hộ | ✅ | ✅ | ❌ | ❌ |
| Đổi trạng thái căn hộ | ✅ | ✅ | ❌ | ❌ |
| Xem lịch sử trạng thái | ✅ | ✅ | ❌ | ❌ |
| Thêm/Sửa nội thất | ✅ | ✅ | ❌ | ❌ |
| Xoá nội thất | ✅ | ❌ | ❌ | ❌ |

### Tenants

| Hành động | ADMIN | MANAGER | TECHNICIAN | RECEPTIONIST |
|-----------|:-----:|:-------:|:----------:|:------------:|
| Xem danh sách khách thuê | ✅ | ✅ | ❌ | ✅ |
| Xem hồ sơ chi tiết | ✅ | ✅ | ❌ | ✅ |
| Tạo hồ sơ khách thuê | ✅ | ✅ | ❌ | ✅ |
| Sửa hồ sơ khách thuê | ✅ | ✅ | ❌ | ✅ |
| Xem lịch sử thuê phòng | ✅ | ✅ | ❌ | ❌ |
| Tạo khai báo tạm trú/vắng | ✅ | ✅ | ❌ | ✅ |
| Xem tất cả khai báo | ✅ | ✅ | ❌ | ✅ |

### Contracts

| Hành động | ADMIN | MANAGER | TECHNICIAN | RECEPTIONIST |
|-----------|:-----:|:-------:|:----------:|:------------:|
| Xem danh sách hợp đồng | ✅ | ✅ | ❌ | ✅ |
| Xem chi tiết hợp đồng | ✅ | ✅ | ❌ | ✅ |
| Tạo hợp đồng | ✅ | ✅ | ❌ | ❌ |
| Sửa điều khoản | ✅ | ✅ | ❌ | ❌ |
| Gia hạn hợp đồng | ✅ | ✅ | ❌ | ❌ |
| Chấm dứt hợp đồng | ✅ | ✅ | ❌ | ❌ |
| Xem lịch sử gia hạn | ✅ | ✅ | ❌ | ✅ |

### System

| Hành động | ADMIN | MANAGER | TECHNICIAN | RECEPTIONIST |
|-----------|:-----:|:-------:|:----------:|:------------:|
| Xem trang Users | ✅ | ❌ | ❌ | ❌ |
| Tạo tài khoản nhân viên | ✅ | ❌ | ❌ | ❌ |
| Sửa thông tin nhân viên | ✅ | ❌ | ❌ | ❌ |
| Khoá/Mở khoá tài khoản | ✅ | ❌ | ❌ | ❌ |
| Xem Dashboard | ✅ | ✅ | ✅ | ✅ |
| Đổi mật khẩu (own) | ✅ | ✅ | ✅ | ✅ |

---

## Constants — Roles

```js
// src/constants/roles.js
export const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  TECHNICIAN: 'TECHNICIAN',
  RECEPTIONIST: 'RECEPTIONIST',
};

// Nhóm role tiện dùng
export const MANAGEMENT_ROLES = [ROLES.ADMIN, ROLES.MANAGER];
export const TENANT_ACCESS_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.RECEPTIONIST];
export const CONTRACT_VIEW_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.RECEPTIONIST];
export const ALL_ROLES = Object.values(ROLES);
```

---

## Hook: useAuth

```jsx
// src/contexts/AuthContext.jsx

import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/axios.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setIsLoading(false);
      return;
    }
    api.get('/auth/me')
      .then(res => setUser(res.data.data))
      .catch(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { accessToken, refreshToken, user } = res.data.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải được dùng trong AuthProvider');
  return ctx;
};
```

---

## Component: ProtectedRoute

```jsx
// src/components/common/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { LoadingSpinner } from './LoadingSpinner.jsx';

/**
 * Bảo vệ route: redirect /login nếu chưa auth.
 * Tuỳ chọn: kiểm tra thêm roles.
 *
 * @param {string[]} roles - Nếu truyền, chỉ cho phép user có role trong mảng này.
 */
export function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingSpinner fullScreen />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
```

---

## Component: RoleGuard

```jsx
// src/components/common/RoleGuard.jsx
import { useAuth } from '@/contexts/AuthContext.jsx';

/**
 * Ẩn children nếu user không có role trong danh sách.
 * Không render gì cả (null) — không disabled, không show "forbidden".
 *
 * Dùng để wrap nút, form section, cột bảng...
 */
export function RoleGuard({ roles, children }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return null;
  return children;
}
```

---

## Cách dùng trong JSX

### Ẩn nút theo role
```jsx
import { RoleGuard } from '@/components/common/RoleGuard.jsx';
import { MANAGEMENT_ROLES, ROLES } from '@/constants/roles.js';

// Nút chỉ ADMIN/MANAGER thấy
<RoleGuard roles={MANAGEMENT_ROLES}>
  <button onClick={openCreateModal}>+ Tạo hợp đồng</button>
</RoleGuard>

// Nút chỉ ADMIN thấy
<RoleGuard roles={[ROLES.ADMIN]}>
  <button onClick={handleDelete} className="text-red-600">Xoá</button>
</RoleGuard>
```

### Bảo vệ route trong App.jsx
```jsx
import { ProtectedRoute } from '@/components/common/ProtectedRoute.jsx';
import { ROLES, MANAGEMENT_ROLES } from '@/constants/roles.js';

<Route
  path="/contracts/new"
  element={
    <ProtectedRoute roles={MANAGEMENT_ROLES}>
      <ContractFormPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/users"
  element={
    <ProtectedRoute roles={[ROLES.ADMIN]}>
      <UsersPage />
    </ProtectedRoute>
  }
/>
```

### Ẩn cột trong DataTable
```jsx
// Cột "Hành động xoá" chỉ ADMIN thấy
const columns = [
  { key: 'name', label: 'Tên' },
  { key: 'status', label: 'Trạng thái' },
  // Chỉ thêm cột này nếu user là ADMIN
  ...(user?.role === ROLES.ADMIN ? [{ key: 'actions', label: '' }] : []),
];
```

### Ẩn Sidebar menu theo role
```jsx
// Sidebar.jsx — lọc nav items theo role hiện tại
const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', roles: ALL_ROLES },
  { path: '/buildings', label: 'Tòa nhà', roles: ALL_ROLES },
  { path: '/apartments', label: 'Căn hộ', roles: ALL_ROLES },
  { path: '/tenants', label: 'Khách thuê', roles: TENANT_ACCESS_ROLES },
  { path: '/contracts', label: 'Hợp đồng', roles: CONTRACT_VIEW_ROLES },
  { path: '/users', label: 'Nhân viên', roles: [ROLES.ADMIN] },
];

const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(user?.role));
```

---

## Checklist RBAC khi viết component

- [ ] Nút tạo/sửa/xoá được bọc trong `<RoleGuard roles={...}>`
- [ ] Route nhạy cảm (users, contracts/new) dùng `<ProtectedRoute roles={...}>`
- [ ] Sidebar chỉ hiện các menu phù hợp với role hiện tại
- [ ] Không dùng `disabled` thay cho `hidden` với security-critical actions
- [ ] TECHNICIAN không thấy tab Tenant/Contract trong Sidebar
