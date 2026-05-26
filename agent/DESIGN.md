# DESIGN.md — Frontend QLCHDC (Quản lý Căn hộ Dịch vụ)

> **Đọc file này trước khi làm bất kỳ điều gì với Frontend.**
> Đây là bản thiết kế tổng thể, làm căn cứ để AI viết code React đúng chuẩn dự án.

---

## 1. Tổng quan

Hệ thống quản lý nội bộ — dùng bởi **nhân viên** (Admin, Manager, Technician, Receptionist), **không phải khách thuê**.

| Lớp | Công nghệ |
|-----|-----------|
| Framework | React 18 + Vite |
| Routing | React Router DOM v6 |
| HTTP Client | Axios (singleton instance) |
| Styling | Tailwind CSS v3 |
| State (global) | React Context API |
| State (server) | TanStack Query v5 (React Query) |
| Form | React Hook Form + Zod |
| Icons | Lucide React |

---

## 2. Cấu trúc thư mục Frontend

```
apps/frontend/
└── src/
    ├── main.jsx                ← Entry point
    ├── App.jsx                 ← Router config (tất cả routes)
    ├── lib/
    │   ├── axios.js            ← Axios singleton với interceptor
    │   └── queryClient.js      ← TanStack Query client config
    ├── contexts/
    │   └── AuthContext.jsx     ← Global auth state (user, token, logout)
    ├── components/
    │   ├── layout/
    │   │   ├── AppLayout.jsx   ← Wrapper: Sidebar + Navbar + <Outlet/>
    │   │   ├── Sidebar.jsx     ← Nav menu (ẩn/hiện theo role)
    │   │   └── Navbar.jsx      ← Top bar: user info, logout
    │   ├── common/
    │   │   ├── ProtectedRoute.jsx   ← Guard: redirect login nếu chưa auth
    │   │   ├── RoleGuard.jsx        ← Guard: ẩn children nếu không đủ role
    │   │   ├── PageHeader.jsx       ← Tiêu đề trang + breadcrumb
    │   │   ├── DataTable.jsx        ← Bảng dữ liệu có phân trang + filter
    │   │   ├── StatusBadge.jsx      ← Badge hiển thị status ENUM
    │   │   ├── ConfirmDialog.jsx    ← Modal xác nhận (xoá, terminate...)
    │   │   ├── EmptyState.jsx       ← Trạng thái rỗng
    │   │   └── LoadingSpinner.jsx   ← Loading indicator
    │   └── forms/
    │       ├── FormField.jsx        ← Label + Input + Error message
    │       └── SearchBar.jsx        ← Thanh tìm kiếm debounce
    └── modules/                ← Mỗi module = 1 thư mục
        ├── auth/
        ├── building/
        ├── tenant/
        └── contract/

modules/<tên-module>/frontend/  ← Code domain của module
├── pages/                      ← Trang đầy đủ (route target)
├── components/                 ← Component riêng của module
├── hooks/                      ← Custom hooks (useQuery, useMutation)
└── services/                   ← Hàm gọi API (không chứa hook)
```

---

## 3. Bản đồ Routes

| Path | Component | Roles được phép | Ghi chú |
|------|-----------|-----------------|---------|
| `/login` | `LoginPage` | Public | Redirect → `/dashboard` nếu đã login |
| `/` | Redirect | Any auth | → `/dashboard` |
| `/dashboard` | `DashboardPage` | Tất cả | Thống kê tổng quan |
| `/buildings` | `BuildingsPage` | Tất cả | Danh sách tòa nhà |
| `/buildings/:id` | `BuildingDetailPage` | Tất cả | Chi tiết + danh sách tầng |
| `/apartments` | `ApartmentsPage` | Tất cả | Danh sách căn hộ + filter |
| `/apartments/:id` | `ApartmentDetailPage` | Tất cả | Chi tiết + nội thất + logs |
| `/tenants` | `TenantsPage` | ADMIN, MANAGER, RECEPTIONIST | Danh sách khách thuê |
| `/tenants/new` | `TenantFormPage` | ADMIN, MANAGER, RECEPTIONIST | Tạo hồ sơ mới |
| `/tenants/:id` | `TenantDetailPage` | ADMIN, MANAGER, RECEPTIONIST | Hồ sơ + lịch sử |
| `/contracts` | `ContractsPage` | ADMIN, MANAGER | Danh sách hợp đồng |
| `/contracts/new` | `ContractFormPage` | ADMIN, MANAGER | Tạo hợp đồng |
| `/contracts/:id` | `ContractDetailPage` | ADMIN, MANAGER, RECEPTIONIST | Chi tiết + gia hạn |
| `/users` | `UsersPage` | ADMIN | Quản lý nhân viên |
| `/profile` | `ProfilePage` | Tất cả | Đổi mật khẩu |

---

## 4. API Endpoints — Mapping đầy đủ với Frontend

> Base URL: `http://localhost:3001`  
> Header: `Authorization: Bearer <accessToken>`

### 4.1 Auth Module (`/api/auth`)

| Method | Endpoint | Dùng ở | Ghi chú |
|--------|----------|--------|---------|
| POST | `/api/auth/login` | `LoginPage` | Trả về `{ accessToken, refreshToken, user }` |
| POST | `/api/auth/refresh` | `axios interceptor` | Tự động gọi khi 401 |
| POST | `/api/auth/logout` | `Navbar` (logout btn) | Xoá token ở localStorage |
| GET | `/api/auth/me` | `AuthContext` init | Lấy user hiện tại khi app load |
| PUT | `/api/auth/change-password` | `ProfilePage` | `{ oldPassword, newPassword }` |
| GET | `/api/auth/users` | `UsersPage` | ADMIN only |
| POST | `/api/auth/users` | `UsersPage` (modal tạo) | ADMIN only |
| PUT | `/api/auth/users/:id` | `UsersPage` (modal sửa) | ADMIN only |
| PATCH | `/api/auth/users/:id/toggle-active` | `UsersPage` (toggle) | ADMIN only |

### 4.2 Building Module (`/api/building`)

| Method | Endpoint | Dùng ở | Ghi chú |
|--------|----------|--------|---------|
| GET | `/api/building/buildings` | `BuildingsPage` | `?search=&page=&limit=` |
| GET | `/api/building/buildings/:id` | `BuildingDetailPage` | Include floors |
| POST | `/api/building/buildings` | `BuildingsPage` (modal tạo) | ADMIN |
| PUT | `/api/building/buildings/:id` | `BuildingDetailPage` (modal sửa) | ADMIN, MANAGER |
| GET | `/api/building/buildings/:id/floors` | `BuildingDetailPage` | Danh sách tầng |
| POST | `/api/building/buildings/:id/floors` | `BuildingDetailPage` (modal) | `{ from_floor, to_floor }` |
| GET | `/api/building/apartments` | `ApartmentsPage` | `?status=&building_id=&floor_id=&room_type=&page=&limit=` |
| GET | `/api/building/apartments/:id` | `ApartmentDetailPage` | Include furniture + floor + building |
| POST | `/api/building/apartments` | `ApartmentsPage` (modal tạo) | ADMIN, MANAGER |
| PUT | `/api/building/apartments/:id` | `ApartmentDetailPage` (modal sửa) | ADMIN, MANAGER |
| PATCH | `/api/building/apartments/:id/status` | `ApartmentDetailPage` (btn) | `{ new_status, reason }` |
| GET | `/api/building/apartments/:id/status-logs` | `ApartmentDetailPage` (tab) | Lịch sử trạng thái |
| GET | `/api/building/apartments/:id/furniture` | `ApartmentDetailPage` (tab) | Danh sách nội thất |
| POST | `/api/building/apartments/:id/furniture` | `ApartmentDetailPage` (modal) | ADMIN, MANAGER |
| PUT | `/api/building/furniture/:id` | `ApartmentDetailPage` (modal sửa) | ADMIN, MANAGER |
| DELETE | `/api/building/furniture/:id` | `ApartmentDetailPage` (btn xoá) | ADMIN |

### 4.3 Tenant Module (`/api/tenant`)

| Method | Endpoint | Dùng ở | Ghi chú |
|--------|----------|--------|---------|
| GET | `/api/tenant/tenants` | `TenantsPage` | `?search=&status=&page=&limit=` |
| GET | `/api/tenant/tenants/:id` | `TenantDetailPage` | Include contracts + registrations |
| POST | `/api/tenant/tenants` | `TenantFormPage` | Tạo hồ sơ |
| PUT | `/api/tenant/tenants/:id` | `TenantDetailPage` (modal sửa) | Cập nhật hồ sơ |
| GET | `/api/tenant/tenants/:id/history` | `TenantDetailPage` (tab) | Lịch sử thuê phòng |
| GET | `/api/tenant/tenants/:id/registrations` | `TenantDetailPage` (tab) | Danh sách khai báo |
| POST | `/api/tenant/tenants/:id/registrations` | `TenantDetailPage` (modal) | Tạo khai báo tạm trú/vắng |
| GET | `/api/tenant/registrations` | `TenantsPage` (tab phụ) | ADMIN, MANAGER, lọc theo tháng |

### 4.4 Contract Module (`/api/contract`)

| Method | Endpoint | Dùng ở | Ghi chú |
|--------|----------|--------|---------|
| GET | `/api/contract` | `ContractsPage` | `?status=&apartment_id=&tenant_id=&page=&limit=` |
| GET | `/api/contract/expiring-soon` | `DashboardPage`, `ContractsPage` | Widget cảnh báo |
| GET | `/api/contract/:id` | `ContractDetailPage` | Include tenant + apartment + renewals |
| POST | `/api/contract` | `ContractFormPage` | Tạo hợp đồng |
| PUT | `/api/contract/:id` | `ContractDetailPage` (modal sửa) | Cập nhật điều khoản |
| PATCH | `/api/contract/:id/terminate` | `ContractDetailPage` (btn) | `{ termination_reason }` |
| POST | `/api/contract/:id/renew` | `ContractDetailPage` (modal) | `{ new_end_date, new_monthly_rent? }` |
| GET | `/api/contract/:id/renewals` | `ContractDetailPage` (tab) | Lịch sử gia hạn |

---

## 5. Thiết kế từng trang

### 5.1 LoginPage
```
Layout: Full-screen centered card
Fields: email (input), password (input password)
Actions: Nút "Đăng nhập"
Logic:
  - POST /api/auth/login
  - Lưu accessToken + refreshToken vào localStorage
  - Gọi GET /api/auth/me → lưu vào AuthContext
  - Redirect → /dashboard
Errors: 401 → "Sai email hoặc mật khẩu", 403 → "Tài khoản bị khoá"
```

### 5.2 DashboardPage
```
Layout: Grid widget 2x2 + danh sách cảnh báo
Widgets:
  - Tổng căn hộ theo status (AVAILABLE/OCCUPIED/MAINTENANCE/RESERVED)
    → GET /api/building/apartments (group client-side hoặc summary endpoint)
  - Hợp đồng sắp hết hạn (≤ 30 ngày)
    → GET /api/contract/expiring-soon
  - Số khách thuê đang active
    → GET /api/tenant/tenants?status=ACTIVE&limit=1 (lấy total)
  - Danh sách 5 hợp đồng sắp hết hạn gần nhất (table mini)
```

### 5.3 BuildingsPage
```
Layout: Header (title + btn Thêm) + DataTable
Columns: Mã, Tên, Địa chỉ, Số tầng, Hành động
Actions per row: [Xem chi tiết]
Search: theo tên, mã
Roles: Thêm tòa nhà → ADMIN only
Modal tạo: code, name, address, total_floors, description
```

### 5.4 BuildingDetailPage
```
Layout: PageHeader + Info card + Tab (Danh sách tầng | Tạo tầng hàng loạt)
Tab "Danh sách tầng": list tầng + nút → xem apartments của tầng đó
Tab "Tạo tầng": Form from_floor, to_floor → POST bulk floors
Nút "Sửa thông tin tòa nhà" → modal (ADMIN, MANAGER)
```

### 5.5 ApartmentsPage
```
Layout: FilterBar + DataTable (hoặc Grid Card view)
Filters: status (dropdown), building_id (dropdown), room_type (dropdown)
Search: apartment_code
Columns: Mã phòng, Loại, Diện tích, Giá cơ bản, Trạng thái, Tầng/Tòa, Hành động
StatusBadge màu: AVAILABLE=green, OCCUPIED=blue, MAINTENANCE=yellow, RESERVED=purple
Actions: [Xem chi tiết]
Nút "Thêm căn hộ" → modal (ADMIN, MANAGER)
```

### 5.6 ApartmentDetailPage
```
Layout: PageHeader + Info section + 3 Tabs
Tab "Nội thất": DataTable furniture (item_name, quantity, condition)
  → Thêm/Sửa/Xoá (ADMIN, MANAGER / ADMIN)
Tab "Lịch sử trạng thái": Timeline logs (old→new, lý do, người đổi, thời gian)
Tab "Hợp đồng hiện tại": info contract ACTIVE (nếu có)
Section "Đổi trạng thái": Dropdown + Reason → PATCH status (ADMIN, MANAGER)
  Hiển thị các transition hợp lệ theo state machine
```

### 5.7 TenantsPage
```
Layout: Header + SearchBar + FilterStatus + DataTable
Filters: status (ACTIVE/EXPIRED/ALL)
Search: full_name, national_id, phone
Columns: Họ tên, CCCD, SĐT, Phòng hiện tại, Trạng thái HĐ, Hành động
Actions: [Xem hồ sơ]
Nút "Thêm khách thuê" → /tenants/new
```

### 5.8 TenantFormPage
```
Layout: Card form 2 cột
Fields:
  - full_name*, national_id*, national_id_issued_date*, national_id_issued_place*
  - date_of_birth*, gender* (select), phone*, email
  - permanent_address*, nationality (default "Việt Nam"), occupation
  - avatar_url
Actions: Hủy → /tenants | Lưu → POST + redirect /tenants/:id
Validation: CCCD unique (check error 409)
```

### 5.9 TenantDetailPage
```
Layout: Header (tên + avatar) + Info card + 3 Tabs
Info card: thông tin hồ sơ + nút "Sửa" → modal
Tab "Lịch sử thuê phòng": Timeline contracts (apartment, thời gian, status)
Tab "Khai báo tạm trú/vắng": DataTable registrations + modal tạo mới
  Modal: type (TEMPORARY_RESIDENCE/TEMPORARY_ABSENCE), start_date, end_date, destination?, reason?
Tab "Hợp đồng hiện tại": info contract đang ACTIVE (nếu có) + link → /contracts/:id
```

### 5.10 ContractsPage
```
Layout: Header + Filter (status, expiring-soon toggle) + DataTable
Filters: status dropdown, search theo tenant/apartment
Banner cảnh báo: số HĐ EXPIRING_SOON (link filter)
Columns: Mã HĐ, Khách thuê, Phòng, Ngày bắt đầu, Ngày kết thúc, Giá thuê, Trạng thái
Actions: [Xem chi tiết]
Nút "Tạo hợp đồng" → /contracts/new (ADMIN, MANAGER)
```

### 5.11 ContractFormPage
```
Layout: Card form 2 cột
Fields:
  - tenant_id* (SearchSelect: tìm khách theo tên/CCCD)
  - apartment_id* (SearchSelect: chỉ hiện AVAILABLE/RESERVED)
  - start_date*, end_date*
  - monthly_rent*, deposit_amount*, payment_due_day* (1-28)
  - notes
Actions: Hủy → /contracts | Tạo hợp đồng → POST + redirect /contracts/:id
Validation:
  - end_date > start_date
  - payment_due_day 1-28
  - apartment phải AVAILABLE/RESERVED
```

### 5.12 ContractDetailPage
```
Layout: PageHeader + Info card + Tabs
Info card: thông tin HĐ + StatusBadge + days_left nếu EXPIRING_SOON
  Actions (ADMIN, MANAGER):
    - Nút "Gia hạn" (modal) → chỉ khi ACTIVE/EXPIRING_SOON
    - Nút "Chấm dứt sớm" (confirm dialog) → chỉ khi ACTIVE/EXPIRING_SOON
    - Nút "Sửa điều khoản" (modal)
Tab "Thông tin khách thuê": link → /tenants/:id
Tab "Thông tin phòng": link → /apartments/:id
Tab "Lịch sử gia hạn": DataTable renewals (old_end, new_end, new_rent, người gia hạn)
```

### 5.13 UsersPage (ADMIN only)
```
Layout: Header + DataTable
Columns: Họ tên, Email, SĐT, Role, Trạng thái, Lần đăng nhập cuối, Hành động
Actions: [Sửa] [Khoá/Mở khoá]
Nút "Thêm nhân viên" → modal (email, full_name, phone, role)
Default password: "password123" (thông báo cho admin)
```

---

## 6. Auth & Token Flow

```
App Load
  └─→ Đọc localStorage (accessToken, refreshToken)
      ├─ Có token → GET /api/auth/me
      │   ├─ 200 → set AuthContext.user → render App
      │   └─ 401 → xoá token → redirect /login
      └─ Không token → redirect /login

API Request Flow (mọi request)
  └─→ Gắn header Authorization: Bearer <accessToken>
      ├─ 200 → return data
      └─ 401 (token hết hạn)
          └─→ POST /api/auth/refresh { refreshToken }
              ├─ 200 → lưu accessToken mới → retry request gốc
              └─ 401 → logout → redirect /login
```

---

## 7. RBAC — Phân quyền UI

| Chức năng | ADMIN | MANAGER | TECHNICIAN | RECEPTIONIST |
|-----------|-------|---------|------------|--------------|
| Xem Buildings/Apartments | ✅ | ✅ | ✅ | ✅ |
| Thêm/Sửa Building | ✅ | ✅ | ❌ | ❌ |
| Đổi trạng thái Apartment | ✅ | ✅ | ❌ | ❌ |
| Thêm/Sửa Furniture | ✅ | ✅ | ❌ | ❌ |
| Xoá Furniture | ✅ | ❌ | ❌ | ❌ |
| Xem Tenants | ✅ | ✅ | ❌ | ✅ |
| Thêm/Sửa Tenant | ✅ | ✅ | ❌ | ✅ |
| Khai báo tạm trú/vắng | ✅ | ✅ | ❌ | ✅ |
| Xem Contracts | ✅ | ✅ | ❌ | ✅ (view only) |
| Tạo/Sửa Contract | ✅ | ✅ | ❌ | ❌ |
| Gia hạn/Chấm dứt HĐ | ✅ | ✅ | ❌ | ❌ |
| Quản lý Users | ✅ | ❌ | ❌ | ❌ |

> **Nguyên tắc hiển thị:** HIDE nút/action nếu không đủ role (không render, không disable).  
> Dùng component `<RoleGuard roles={['ADMIN', 'MANAGER']}>` để wrap.

---

## 8. Cấu trúc State Management

```
AuthContext (global)
├── user: { id, email, full_name, role }
├── accessToken: string
├── isAuthenticated: boolean
├── login(email, password) → async
├── logout() → clear localStorage + redirect
└── refreshToken() → internal, gọi bởi axios interceptor

Mỗi page dùng TanStack Query:
├── useQuery → GET data (cache tự động)
├── useMutation → POST/PUT/PATCH/DELETE
└── Invalidate cache sau mutation để refetch
```

---

## 9. Status ENUM & màu sắc

### ApartmentStatus
| Value | Label | Màu Tailwind |
|-------|-------|--------------|
| AVAILABLE | Còn trống | `bg-green-100 text-green-800` |
| OCCUPIED | Đang thuê | `bg-blue-100 text-blue-800` |
| MAINTENANCE | Bảo trì | `bg-yellow-100 text-yellow-800` |
| RESERVED | Đã đặt cọc | `bg-purple-100 text-purple-800` |

### ContractStatus
| Value | Label | Màu Tailwind |
|-------|-------|--------------|
| ACTIVE | Hiệu lực | `bg-green-100 text-green-800` |
| EXPIRING_SOON | Sắp hết hạn | `bg-orange-100 text-orange-800` |
| EXPIRED | Hết hạn | `bg-gray-100 text-gray-600` |
| TERMINATED | Đã chấm dứt | `bg-red-100 text-red-800` |

### UserRole
| Value | Label |
|-------|-------|
| ADMIN | Quản trị viên |
| MANAGER | Quản lý |
| TECHNICIAN | Kỹ thuật viên |
| RECEPTIONIST | Lễ tân |

### RoomType
| Value | Label |
|-------|-------|
| STUDIO | Studio |
| ONE_BR | 1 Phòng ngủ |
| TWO_BR | 2 Phòng ngủ |
| THREE_BR | 3 Phòng ngủ |

---

## 10. Quy tắc Response Handling

```js
// Response thành công luôn có dạng:
{ success: true, data: ... }
{ success: true, data: { items, total, page, limit } }  // list có phân trang

// Response lỗi:
{ success: false, message: "..." }

// Frontend luôn check success trước khi dùng data
// Hiển thị message tiếng Việt từ API trực tiếp lên toast/alert
```

---

## 11. Thứ tự implement FE

1. `apps/frontend/src/` — Setup Vite, Router, Axios, AuthContext, AppLayout
2. Module **auth** — LoginPage, ProfilePage
3. Module **building** — Buildings + Apartments pages
4. Module **tenant** — Tenants pages + forms
5. Module **contract** — Contracts pages + forms + actions
6. Module **users** (admin) — UsersPage
7. **DashboardPage** — Sau khi có đủ data từ các module
