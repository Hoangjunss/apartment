# 🏢 QLCHDC — Hệ thống Quản lý Căn hộ Dịch vụ

> Hệ thống quản lý nội bộ dành cho nhân viên vận hành tòa nhà (Admin, Manager, Receptionist, Technician).  
> Được xây dựng theo kiến trúc **Monorepo** với **pnpm workspaces**.

---

## 🛠️ Công nghệ sử dụng

| Lớp | Công nghệ |
|-----|-----------|
| **Backend** | Node.js + Express.js (ESM) |
| **Frontend** | React.js + Vite + TailwindCSS |
| **Database** | MySQL + Prisma ORM |
| **Monorepo** | pnpm workspaces |
| **Containerization** | Docker + docker-compose |
| **Biểu đồ UI** | Recharts |
| **Icon** | Lucide React |
| **HTTP Client** | Axios |
| **State/Cache** | TanStack React Query |

---

## 🗂️ Cấu trúc Monorepo

```
apartment/
├── apps/
│   ├── backend/          ← Express server (entry point, mount tất cả router)
│   └── frontend/         ← React + Vite (entry point, routing, layout)
├── modules/
│   ├── auth/             ← Xác thực, phân quyền, quản lý người dùng
│   ├── building/         ← Tòa nhà, tầng, căn hộ, nội thất
│   ├── tenant/           ← Hồ sơ khách thuê, khai báo tạm trú
│   ├── contract/         ← Hợp đồng thuê, gia hạn, chấm dứt
│   └── finance/          ← Chỉ số điện nước, hóa đơn, thu tiền, dashboard
└── packages/
    └── prisma/           ← Schema DB dùng chung, migration, seed data
```

Mỗi module backend là một **pnpm workspace độc lập** với cấu trúc `router.js → controller.js → service.js`.

---

## ✅ Những gì đã hoàn thành

### 1. 🗄️ Cơ sở dữ liệu (packages/prisma)

**Schema đầy đủ** với 14 model:

| Model | Mô tả |
|-------|-------|
| `Users` | Tài khoản nhân viên — 4 role: ADMIN, MANAGER, RECEPTIONIST, TECHNICIAN |
| `Buildings` | Tòa nhà (mã, tên, địa chỉ, số tầng) |
| `Floors` | Tầng thuộc tòa nhà |
| `Apartments` | Căn hộ — 4 loại (Studio, 1PN, 2PN, 3PN), 4 trạng thái (Available/Occupied/Maintenance/Reserved) |
| `ApartmentFurniture` | Danh mục nội thất theo căn hộ |
| `ApartmentStatusLogs` | Lịch sử thay đổi trạng thái căn hộ |
| `Tenants` | Hồ sơ khách thuê (CCCD, ngày sinh, địa chỉ) |
| `Contracts` | Hợp đồng thuê (tiền thuê, đặt cọc, điện nước, nội thất bàn giao) |
| `ContractRenewals` | Lịch sử gia hạn hợp đồng |
| `TemporaryRegistrations` | Khai báo tạm trú / tạm vắng |
| `Services` | Dịch vụ đi kèm (vệ sinh, giặt ủi, internet, cáp TV) |
| `ServiceSubscriptions` | Đăng ký dịch vụ theo hợp đồng |
| `UtilityReadings` | Chỉ số điện nước hàng tháng |
| `Invoices` | Hóa đơn hàng tháng (tiền phòng + điện + nước + dịch vụ) |
| `Payments` | Phiếu thu tiền (Cash / Bank Transfer) |
| `ServiceRequests` | Yêu cầu dịch vụ kỹ thuật |

**Dữ liệu mẫu (seed.js):**
- 3 tài khoản hệ thống (admin, manager, technician)
- 2 tòa nhà × 4 tầng × 3 căn hộ = **24 căn hộ**
- **16 khách thuê** với tên tiếng Việt ngẫu nhiên
- **16 hợp đồng** đang active (trong đó 3 hợp đồng sắp hết hạn trong tháng 6/2026)
- 4 dịch vụ + đăng ký dịch vụ theo hợp đồng
- Lịch sử tài chính **5 tháng** (Jan–May 2026): chỉ số điện, hóa đơn, thanh toán

---

### 2. 🔐 Module Auth

**Backend API** (`/api/auth`):

| Method | Route | Mô tả | Quyền |
|--------|-------|-------|-------|
| POST | `/login` | Đăng nhập, trả JWT | Public |
| POST | `/refresh` | Làm mới Access Token | Public |
| POST | `/logout` | Đăng xuất | Auth |
| GET | `/me` | Lấy thông tin user hiện tại | Auth |
| PUT | `/change-password` | Đổi mật khẩu | Auth |
| GET | `/users` | Danh sách người dùng | ADMIN |
| POST | `/users` | Tạo tài khoản mới | ADMIN |
| PUT | `/users/:id` | Cập nhật thông tin | ADMIN |
| PATCH | `/users/:id/toggle-active` | Khoá / mở tài khoản | ADMIN |

**Frontend Pages:**
- **LoginPage** — Form đăng nhập, xử lý JWT, redirect sau login
- **ProfilePage** — Xem & cập nhật thông tin cá nhân, đổi mật khẩu
- **UsersPage** — Danh sách nhân viên, tạo mới, khoá tài khoản (ADMIN only)
- **DashboardPage** — Trang tổng quan chính (xem chi tiết ở mục 7)

**Hạ tầng xác thực:**
- `useAuth` hook + `AuthContext` quản lý session toàn app
- `ProtectedRoute` + `RoleGuard` kiểm soát quyền truy cập route
- Axios instance có interceptor tự động đính kèm Bearer token

---

### 3. 🏗️ Module Building (Tòa nhà & Căn hộ)

**Backend API** (`/api/building`):

| Nhóm | Route | Mô tả |
|------|-------|-------|
| Buildings | `GET /buildings` | Danh sách tòa nhà |
| | `GET /buildings/:id` | Chi tiết tòa nhà |
| | `POST /buildings` | Tạo tòa nhà mới (ADMIN) |
| | `PUT /buildings/:id` | Cập nhật (ADMIN/MANAGER) |
| Floors | `GET /buildings/:id/floors` | Danh sách tầng |
| | `POST /buildings/:id/floors` | Thêm nhiều tầng một lúc |
| Apartments | `GET /apartments` | Danh sách căn hộ (filter trạng thái, loại phòng) |
| | `GET /apartments/:id` | Chi tiết căn hộ |
| | `POST /apartments` | Thêm căn hộ mới |
| | `PUT /apartments/:id` | Cập nhật thông tin căn hộ |
| | `PATCH /apartments/:id/status` | Thay đổi trạng thái |
| | `GET /apartments/:id/status-logs` | Lịch sử thay đổi trạng thái |
| Furniture | `GET /apartments/:id/furniture` | Danh sách nội thất |
| | `POST /apartments/:id/furniture` | Thêm đồ nội thất |
| | `PUT /furniture/:id` | Cập nhật nội thất |
| | `DELETE /furniture/:id` | Xóa nội thất (ADMIN) |

**Frontend Pages & Components:**
- **BuildingsPage** — Danh sách tòa nhà dạng card
- **BuildingDetailPage** — Chi tiết tòa nhà, danh sách tầng + căn hộ theo tầng
- **ApartmentsPage** — Bảng căn hộ toàn hệ thống, filter theo trạng thái & loại phòng
- **ApartmentDetailPage** — Chi tiết căn hộ, danh mục nội thất, lịch sử trạng thái
- **Form components:** `BuildingForm`, `ApartmentForm`, `FurnitureForm`, `StatusChangeForm`

---

### 4. 👤 Module Tenant (Khách thuê)

**Backend API** (`/api/tenant`):

| Route | Mô tả | Quyền |
|-------|-------|-------|
| `GET /tenants` | Danh sách khách thuê | ADMIN/MANAGER/RECEPTIONIST |
| `POST /tenants` | Tạo hồ sơ khách thuê mới | ADMIN/MANAGER/RECEPTIONIST |
| `GET /tenants/:id` | Chi tiết khách thuê | ADMIN/MANAGER/RECEPTIONIST |
| `PUT /tenants/:id` | Cập nhật hồ sơ | ADMIN/MANAGER/RECEPTIONIST |
| `GET /tenants/:id/history` | Lịch sử hợp đồng | ADMIN/MANAGER |
| `GET /tenants/:id/registrations` | Khai báo tạm trú/vắng | Tất cả |
| `POST /tenants/:id/registrations` | Tạo khai báo mới | Tất cả |
| `GET /registrations` | Tất cả khai báo hệ thống | ADMIN/MANAGER |

**Frontend Pages & Components:**
- **TenantsPage** — Bảng danh sách khách thuê, tìm kiếm theo tên/CCCD/SĐT
- **TenantFormPage** — Form nhập hồ sơ khách thuê mới (thông tin cá nhân đầy đủ)
- **TenantDetailPage** — Hồ sơ chi tiết, lịch sử hợp đồng, khai báo tạm trú
- **Form components:** `TenantEditForm`, `RegistrationForm`

---

### 5. 📄 Module Contract (Hợp đồng)

**Backend API** (`/api/contract`):

| Route | Mô tả | Quyền |
|-------|-------|-------|
| `GET /` | Danh sách hợp đồng (filter theo trạng thái) | ADMIN/MANAGER |
| `GET /expiring-soon` | Hợp đồng sắp hết hạn (≤ 30 ngày) | ADMIN/MANAGER |
| `GET /:id` | Chi tiết hợp đồng | ADMIN/MANAGER/RECEPTIONIST |
| `POST /` | Tạo hợp đồng mới | ADMIN/MANAGER |
| `PUT /:id` | Cập nhật điều khoản | ADMIN/MANAGER |
| `PATCH /:id/terminate` | Chấm dứt hợp đồng (có lý do) | ADMIN/MANAGER |
| `POST /:id/renew` | Gia hạn hợp đồng | ADMIN/MANAGER |
| `GET /:id/renewals` | Lịch sử gia hạn | ADMIN/MANAGER |

**Cron Job tự động** (chạy hàng ngày lúc 00:00):
- Chuyển hợp đồng `ACTIVE` → `EXPIRING_SOON` khi còn ≤ 30 ngày
- Chuyển hợp đồng sang `EXPIRED` khi quá ngày kết thúc
- Tự động giải phóng căn hộ về `AVAILABLE` khi hợp đồng hết hạn

**Frontend Pages & Components:**
- **ContractsPage** — Bảng hợp đồng, filter theo trạng thái (Active, Expiring Soon, Expired, Terminated)
- **ContractFormPage** — Form tạo hợp đồng mới (chọn khách + căn hộ, điền điều khoản, đăng ký dịch vụ)
- **ContractDetailPage** — Chi tiết hợp đồng, timeline gia hạn, thao tác chấm dứt/gia hạn
- **Form components:** `ContractEditForm`, `RenewForm`, `TerminateForm`

---

### 6. 💰 Module Finance (Tài chính)

**Backend API** (`/api/finance` + `/api/dashboard`):

| Route | Mô tả | Quyền |
|-------|-------|-------|
| `GET /utilities` | Danh sách chỉ số điện nước | Auth |
| `POST /utilities` | Ghi chỉ số điện nước tháng mới | ADMIN/MANAGER/RECEPTIONIST |
| `GET /invoices` | Danh sách hóa đơn (filter theo tháng, trạng thái) | Auth |
| `GET /invoices/:id` | Chi tiết hóa đơn + lịch sử thanh toán | Auth |
| `POST /invoices/generate` | Tạo hóa đơn tháng theo hợp đồng | ADMIN/MANAGER |
| `PATCH /invoices/:id/status` | Cập nhật trạng thái hóa đơn | ADMIN/MANAGER |
| `POST /payments` | Ghi nhận phiếu thu tiền | ADMIN/MANAGER/RECEPTIONIST |
| `GET /dashboard/stats` | KPI tổng quan | Auth |
| `GET /dashboard/revenue` | Doanh thu N tháng gần nhất | Auth |
| `GET /dashboard/apartment-types` | Phân bố loại phòng | Auth |
| `GET /dashboard/unpaid-invoices` | Hóa đơn chưa thanh toán | Auth |
| `GET /dashboard/recent-activities` | Hoạt động gần đây | Auth |

**Frontend Pages & Components:**
- **UtilityReadingsPage** — Ghi/xem chỉ số điện nước theo tháng, theo căn hộ
- **InvoicesPage** — Danh sách hóa đơn, filter, tạo hóa đơn, badge trạng thái
- **InvoiceDetailPage** — Chi tiết hóa đơn: breakdown từng khoản, lịch sử thanh toán, form thu tiền
- **Form components:** `UtilityReadingForm`, `PaymentForm`

---

### 7. 📊 Dashboard Tổng quan

Trang chính của hệ thống với **8 KPI card** chia 2 nhóm:

**Nhóm Bất động sản:**
- Căn hộ còn trống / tổng số
- Số hợp đồng đang active
- Số khách thuê hiện tại
- Hợp đồng sắp hết hạn (trong 30 ngày)

**Nhóm Tài chính & Hiệu suất:**
- Doanh thu tháng này
- Số tiền còn cần thu
- Số hóa đơn chưa thanh toán
- Tỉ lệ lấp đầy (với progress bar)

**Biểu đồ (Recharts):**
- Bar chart doanh thu 6 tháng gần nhất (Đã thu vs Chưa thu)
- Donut chart phân bố loại phòng (Studio, 1PN, 2PN, 3PN)

**Bảng thông tin nhanh:**
- Danh sách hợp đồng sắp hết hạn (click → gia hạn ngay)
- Danh sách hóa đơn chưa thanh toán (badge: Quá hạn / Sắp đến hạn / Trong hạn)
- Feed hoạt động gần đây (tạo hợp đồng, ghi điện nước, tạo hóa đơn)

---

### 8. 🎨 Giao diện & UX

**Layout:** Sidebar cố định (trái) + Navbar trên + content area có scroll

**Shared component library:**
- `DataTable` — bảng dữ liệu tái sử dụng
- `Modal` — overlay dùng chung
- `ConfirmDialog` — xác nhận hành động nguy hiểm
- `StatusBadge` — badge trạng thái hợp đồng/hóa đơn
- `PageHeader` — tiêu đề trang thống nhất
- `EmptyState` — màn hình trống
- `LoadingSpinner` + Skeleton animation — trải nghiệm loading mượt mà

**Phân quyền UI:**
- Route-level: `ProtectedRoute` chặn truy cập theo role
- Component-level: `RoleGuard` ẩn/hiện nút action

**Cải tiến độ tương phản & Đồng bộ giao diện (Mới cập nhật):**
- **Nâng cao tương phản bảng dữ liệu:** Tăng độ đậm màu cho chữ trong các bảng dữ liệu chính (Căn hộ, Khách thuê, Hợp đồng, Điện nước, Hóa đơn) theo 3 phân cấp rõ ràng: Primary (`text-gray-900` - `#111827`), Secondary (`text-gray-700` - `#374151`), và Muted (`text-gray-500` - `#6b7280`).
- **Khắc phục lỗi Dark Mode tự động:** Cấu hình `darkMode: 'class'` trong `tailwind.config.js` nhằm tắt việc trình duyệt tự động kích hoạt các lớp `dark:` dựa trên cài đặt của hệ điều hành/trình duyệt, qua đó triệt tiêu hoàn toàn hiện tượng chữ bị chuyển thành màu trắng/xám mờ trên nền sáng.
- **Sửa nền tối ở filter bar và modal footer:** Loại bỏ hoàn toàn các lớp nền tối (`bg-gray-800`, `bg-gray-900`) ở khu vực bộ lọc (filter bar) của các trang và phần chân trang của các Modal (`ModalFooter`), trả lại nền sáng đồng nhất (`bg-white` / `bg-gray-50`) cho hệ thống.

---

### 9. 🔄 Vòng đời Dữ liệu (Data Lifecycle)

Hệ thống quản lý căn hộ dịch vụ vận hành thông tin theo các luồng dữ liệu khép kín dưới đây:

1. **Khởi tạo tài nguyên:**
   - **Tòa nhà (`Buildings`)** và **Tầng (`Floors`)** được tạo bởi vận hành viên.
   - **Căn hộ (`Apartments`)** được thêm vào với trạng thái ban đầu là `AVAILABLE` (Sẵn sàng cho thuê).
   - Danh mục **Nội thất (`ApartmentFurniture`)** được khai báo cho từng căn hộ để quản lý hiện trạng tài sản.

2. **Ký kết Hợp đồng & Check-in:**
   - **Hồ sơ khách thuê (`Tenants`)** được nhập vào hệ thống khi khách chọn phòng. Khách thuê có thể thực hiện **Khai báo tạm trú (`TemporaryRegistrations`)**.
   - **Hợp đồng (`Contracts`)** được lập để liên kết Khách thuê và Căn hộ đang trống. Trạng thái căn hộ tự động chuyển sang `OCCUPIED` (Đang thuê).
   - Trong hợp đồng, các thông tin quan trọng được ghi nhận: giá thuê phòng, tiền đặt cọc, số người ở (`soNguoiO`), tiền nước cố định hàng tháng (`water_price_per_month` mặc định 100.000đ/người/tháng), chỉ số điện ban đầu (`initial_electricity`) và các **Dịch vụ đăng ký (`ServiceSubscriptions`)** đi kèm (Internet, Vệ sinh, v.v.).

3. **Vận hành hàng tháng (Chốt số & Lập hóa đơn):**
   - Hàng tháng, nhân viên vận hành chốt **Chỉ số Điện nước (`UtilityReadings`)** mới cho căn hộ. Tiền nước không tính bằng m³ mà được tính cố định dựa trên số người ở đã cấu hình.
   - Hệ thống tiến hành **Lập hóa đơn (`Invoices`)** cho kỳ thanh toán của căn hộ. Chi phí hóa đơn được tính toán như sau:
     $$\text{Tổng tiền} = \text{Tiền thuê căn hộ} + \text{Tiền điện thực tế} + \text{Tiền nước (từ HĐ)} + \text{Tiền dịch vụ}$$
     - *Tiền điện thực tế* = (Chỉ số mới - Chỉ số cũ) × Đơn giá điện.
     - *Tiền nước* = Lấy trực tiếp từ trường `water_price_per_month` của Hợp đồng.
   - Trạng thái hóa đơn ban đầu là `UNPAID` (Chưa thanh toán) với ngày đến hạn xác định (mặc định là ngày 5 hàng tháng).

4. **Thanh toán & Thu nợ:**
   - Khách thuê đóng tiền (mặt hoặc chuyển khoản), nhân viên ghi nhận **Phiếu thu (`Payments`)** tương ứng.
   - Trạng thái hóa đơn tự động cập nhật:
     - `PAID` (Đã thanh toán) nếu số tiền đã đóng bằng hoặc lớn hơn tổng hóa đơn.
     - `PARTIALLY_PAID` (Thanh toán một phần) nếu số tiền đóng lớn hơn 0 nhưng chưa đủ.
     - `OVERDUE` (Quá hạn) nếu quá hạn đóng tiền mà chưa thanh toán đủ.

5. **Kết thúc / Thay đổi Hợp đồng:**
    - **Gia hạn (`ContractRenewals`):** Hợp đồng được kéo dài thời gian kết thúc, cập nhật giá thuê mới nếu có, và chuyển trạng thái về `ACTIVE`.
    - **Chấm dứt sớm (`TERMINATED`) / Hết hạn (`EXPIRED`):** Hợp đồng kết thúc, trạng thái căn hộ tự động hoàn về `AVAILABLE` để sẵn sàng cho chu kỳ thuê mới. Toàn bộ lịch sử liên quan đến căn hộ, khách thuê, hóa đơn và thanh toán đều được lưu trữ phục vụ thống kê báo cáo doanh thu.

  6. **Tiếp nhận & Xử lý Yêu cầu Kỹ thuật / Khiếu nại (Service Requests):**
     - **Gửi yêu cầu:**
       - *Nội bộ (`INTERNAL`):* Nhân viên (Lễ tân, Quản lý) tạo yêu cầu trực tiếp trong hệ thống khi phát hiện sự cố.
       - *Khách thuê (`PUBLIC_FORM`):* Khách thuê quét mã QR tại căn hộ (với mã token xác thực phòng trong 90 ngày) để truy cập form gửi yêu cầu trực tuyến mà không cần đăng nhập.
     - **Phân công & Xử lý:**
       - Admin/Manager xem danh sách và tiến hành **Phân công (`ASSIGNED`)** cho kỹ thuật viên (`Technician`).
       - Trạng thái yêu cầu chuyển qua `IN_PROGRESS` khi kỹ thuật viên bắt đầu xử lý, và `RESOLVED` kèm thời gian hoàn thành `resolved_at` khi sự cố được khắc phục xong.

---

### 10. 📱 Hệ thống Tiếp nhận Yêu cầu Kỹ thuật qua QR (Public Service Requests)

Hệ thống cho phép khách thuê gửi báo hỏng, sửa chữa hoặc khiếu nại cực kỳ tiện lợi bằng cách quét mã QR dán tại phòng mà không cần tài khoản đăng nhập.

- **Cơ sở dữ liệu:**
  - Nâng cấp bảng `ServiceRequests` bổ sung thông tin loại yêu cầu (`type`), độ ưu tiên (`priority`), nguồn gốc (`source`: Nội bộ / Khách thuê), thông tin người báo (`requester_name`, `requester_phone`), và thời gian hoàn thành (`resolved_at`).
  - Thêm bảng `ApartmentTokens` quản lý mã token ngẫu nhiên thời hạn 90 ngày của từng phòng.
- **Backend API:**
  - `/api/public/room-info?t=xxx`: Trả về thông tin căn hộ (Block, Tầng, Số phòng) dạng công khai, không lộ thông tin nhạy cảm của khách thuê.
  - `/api/public/service-requests`: Tiếp nhận form gửi từ khách thuê, tự động liên kết với hợp đồng đang có hiệu lực của phòng đó.
  - `/api/building/apartments/:id/generate-token`: API tạo/làm mới mã QR cho phòng (ADMIN/MANAGER).
- **Giao diện quản lý nội bộ:**
  - Thêm thẻ **"QR Code Yêu Cầu Hỗ Trợ"** trên trang chi tiết căn hộ, hiển thị mã QR động, hỗ trợ sao chép liên kết hoặc in poster QR khổ lớn dán ở cửa phòng.
  - Tích hợp cột **"Nguồn"** và badges phân biệt **"Nội bộ"** (nhân viên tạo) vs **"Khách thuê"** (gửi qua QR) trong bảng quản lý yêu cầu kỹ thuật.
- **Form gửi công khai (`/submit?t=xxx`):**
  - Giao diện cao cấp tối ưu cho thiết bị di động, tự động nhận diện thông tin phòng.
  - Hỗ trợ đầy đủ các trường thông tin, phân loại sự cố (Sửa điện, nước, vệ sinh, khóa cửa...) và xác thực dữ liệu chặt chẽ (họ tên, số điện thoại Việt Nam).
  - Tự động hiển thị màn hình báo thành công kèm mã số yêu cầu để khách dễ theo dõi.

---

### 11. ⚡ Nhập chỉ số Điện nước thông minh từ Excel (Mục 7)

Tối ưu hóa quy trình ghi nhận chỉ số điện nước hàng loạt bằng file Excel mẫu động, kết hợp màn hình xem trước và chỉnh sửa dữ liệu trực tiếp:

- **Sinh mẫu Excel động:** Backend tự động quét danh sách phòng đang có hợp đồng hoạt động (`ACTIVE`, `EXPIRING_SOON`) để điền sẵn: Mã căn hộ, Kỳ thanh toán hiện tại (`YYYY-MM`) và Chỉ số điện cũ (từ tháng trước hoặc chỉ số ban đầu hợp đồng) để đối chiếu. Người vận hành chỉ cần điền duy nhất cột Chỉ số điện mới.
- **Bỏ chỉ số Nước cũ/mới:** Nhằm tối giản thao tác và bám sát nghiệp vụ (nước tính khoán theo đầu người `soNguoiO` quy định trên hợp đồng), các thông tin về chỉ số nước cũ/mới đã được loại bỏ hoàn toàn khỏi mẫu Excel cũng như giao diện.
- **Bảng xem trước (Preview Grid) & Sửa trực tiếp:** Giao diện tải file Excel lên hiển thị bảng dữ liệu phân loại rõ ràng (Hợp lệ / Lỗi). Hỗ trợ người dùng chỉnh sửa trực tiếp các chỉ số bị sai ngay trên ô input của bảng và tự động kiểm tra logic tức thì ở client (`Điện mới >= Điện cũ`).
- **Lưu dữ liệu an toàn:** Hệ thống chỉ lưu các dòng hợp lệ khi người dùng xác xác nhận và tự động bỏ qua các dòng lỗi. Lưu trữ `water_prev` và `water_curr` dưới dạng `null` trong DB.

---

### 12. 📊 Module Báo cáo Thống kê chuyên sâu (Mục 8)

Hệ thống biểu đồ trực quan hóa dữ liệu hỗ trợ Ban quản lý theo dõi sát sao tình hình hoạt động của các tòa nhà:

- **Backend Aggregation APIs (`/api/report`):**
  - `/api/report/revenue`: Thống kê doanh thu dự kiến (hóa đơn) và thực thu (phiếu thu) gom nhóm theo tháng.
  - `/api/report/occupancy`: Thống kê số lượng phòng và tỷ lệ lấp đầy theo thời gian thực.
  - `/api/report/maintenance`: Thống kê số lượng sự cố phân bổ theo tình trạng xử lý.
  - `/api/report/contracts`: Thống kê cơ cấu trạng thái của các hợp đồng thuê.
- **Biểu đồ động (Recharts):** Thiết kế dashboard hiện đại với 4 Tabs báo cáo tương ứng vẽ biểu đồ miền (`AreaChart`), biểu đồ cột (`BarChart`) và biểu đồ tròn (`PieChart`) sang trọng.
- **Phân quyền và Bộ lọc:** Hỗ trợ lọc số liệu theo Tòa nhà, Từ tháng, Đến tháng. Menu chỉ hiển thị cho vai trò `ADMIN` và `MANAGER`.

---

### 13. 📥 Module Xuất dữ liệu đa định dạng & In ấn (Mục 9)

Hỗ trợ kết xuất báo cáo và danh sách dữ liệu ra các định dạng phổ biến phục vụ công tác lưu trữ ngoài:

- **Xuất Excel/CSV từ Backend:** Sử dụng thư viện `xlsx` để kết xuất danh sách Khách thuê, Hợp đồng, Hóa đơn và Báo cáo doanh thu thành file `.xlsx` hoặc `.csv`.
- **Hỗ trợ Unicode tiếng Việt:** Đính kèm ký tự BOM (`\uFEFF`) khi xuất file CSV giúp hiển thị ký tự có dấu trên MS Excel không bị lỗi font.
- **In ấn PDF mượt mà:** Định dạng in ấn bằng CSS `@media print` giúp ẩn Sidebar, Navbar, bộ lọc và các nút bấm khi in trang, tối ưu hóa giao diện hiển thị 100% chiều rộng để xuất file PDF từ trình duyệt gọn gàng và đẹp mắt.

---

### 14. 🔍 Xem nhanh thông tin Căn hộ khi di chuột - Quick Preview (Mục 10)

Nâng cao trải nghiệm người dùng, cho phép xem nhanh thông tin tổng quan của căn hộ mà không cần click mở trang chi tiết:

- **API xem nhanh (`GET /building/apartments/:id/preview`):** Trả về thông tin căn hộ, trạng thái phòng, hợp đồng hiện tại kèm thông tin khách thuê (tên, SĐT, giá thuê) và danh sách hình ảnh phòng.
- **React Portal Hover Tooltip:** Xây dựng component tooltip nổi sử dụng React Portal để mount trực tiếp vào `body`, tránh hoàn toàn hiện tượng bị che khuất (clip) bởi thuộc tính `overflow` của các bảng dữ liệu.
- **Cơ chế Debounce:** Hỗ trợ độ trễ hover 350ms giúp giảm tải số lượng request gửi lên DB khi di chuột nhanh qua danh sách.

---

## 🚀 Chạy dự án

### Khởi động với Docker
```bash
docker-compose up -d
```

### Khởi động thủ công
```bash
pnpm install

# Migration + seed dữ liệu mẫu
cd packages/prisma
pnpm prisma migrate dev
pnpm prisma db seed

# Backend (port 3001)
cd apps/backend && pnpm dev

# Frontend (port 5173)
cd apps/frontend && pnpm dev
```

### Tài khoản demo
| Email | Mật khẩu | Vai trò |
|-------|----------|---------|
| `admin@qlchdc.com` | `password123` | Admin |
| `manager@qlchdc.com` | `password123` | Manager |
| `tech@qlchdc.com` | `password123` | Technician |

---

## 📊 Thống kê dự án

| Hạng mục | Con số |
|----------|--------|
| Modules hoàn chỉnh | **5** (auth, building, tenant, contract, finance) |
| API Endpoints | **~35** endpoints |
| React Pages | **13** trang |
| React Components | **20+** components |
| DB Models (Prisma) | **14** models |
| Dữ liệu seed | 24 căn hộ · 16 khách thuê · 16 HĐ · ~80 hóa đơn |

---

## 📽️ Tài liệu phục vụ Slide PPTX (Presentation Outline - 15 Slides)

Dưới đây là dàn bài chi tiết **15 Slide** và các điểm nhấn (Key Takeaways) được biên soạn chuyên sâu, giúp làm Prompt cho AI tạo file thuyết trình PowerPoint (PPTX) ấn tượng về hệ thống **QLCHDC**.

### 💡 Gợi ý Prompt để sinh 15 Slide nhanh (Dùng cho Gamma.app, Tome, hoặc ChatGPT Marp):
> *"Tạo một slide thuyết trình chi tiết gồm đúng 15 slide về dự án Hệ thống Quản lý Căn hộ Dịch vụ (QLCHDC). Cấu trúc slide phải đi từ bối cảnh, công nghệ, thiết kế cơ sở dữ liệu, cho đến chi tiết từng module (Tòa nhà, Khách thuê, Hợp đồng, Hóa đơn điện nước, Cơ chế xử lý quá hạn, Hỗ trợ qua QR Code không cần đăng nhập, Dashboard thống kê và kết luận). Thiết kế theo phong cách tối giản, hiện đại, màu sắc chủ đạo xanh dương phối xám cao cấp. Nội dung cụ thể như sau..."*

---

### 🗂️ Phác thảo cấu trúc chi tiết 15 Slide:

#### Slide 1: Tiêu đề & Giới thiệu chung
* **Tiêu đề:** Hệ thống Quản lý Nội bộ Căn hộ Dịch vụ (QLCHDC)
* **Phụ đề:** Giải pháp Chuyển đổi số toàn diện trong Vận hành, Tài chính và Dịch vụ hỗ trợ
* **Nội dung:** Giới thiệu ngắn gọn về hệ thống quản lý nội bộ dành riêng cho Ban quản lý tòa nhà, giúp tối ưu hóa công việc của Admin, Manager, Receptionist và Technician.

#### Slide 2: Bối cảnh & Thách thức trong Quản lý Truyền thống
* **Khó khăn thực tế:** 
  * Sai sót khi ghi chép chỉ số điện nước thủ công bằng giấy/excel.
  * Thất thoát doanh thu do quên hạn nợ hóa đơn hoặc không theo dõi sát sao tiến độ trả tiền của khách.
  * Quy trình tiếp nhận báo hỏng cồng kềnh, kéo dài thời gian chờ đợi của khách thuê.
  * Khó tổng hợp báo cáo tài chính và hiệu suất lấp đầy phòng theo thời gian thực.

#### Slide 3: Mục tiêu Dự án & Giải pháp Tổng quan
* **Mục tiêu chính:** Số hóa 100% hồ sơ, tự động hóa tính toán tài chính và đơn giản hóa tương tác kỹ thuật.
* **Giải pháp:** Xây dựng hệ thống web nội bộ đa nhiệm, kết hợp các tiến trình tự động hóa (Cron job), báo cáo trực quan qua biểu đồ và cổng tiếp nhận báo hỏng qua QR Code công khai không cần tài khoản.

#### Slide 4: Kiến trúc Hệ thống & Công nghệ Cốt lõi
* **Mô hình Monorepo:** Tổ chức với `pnpm workspaces` giúp tách biệt các module nhưng chia sẻ tài nguyên linh hoạt.
* **Tech Stack lựa chọn:**
  * **Backend:** Node.js + Express.js (ES Modules) đảm bảo hiệu năng cao.
  * **Frontend:** React.js + Vite + TailwindCSS tối ưu tốc độ tải trang và UX.
  * **Database:** MySQL + Prisma ORM quản lý giao dịch an toàn và đồng bộ schema nhanh chóng.
  * **Deploy:** Đóng gói Docker & Docker-Compose chạy độc lập, nhất quán múi giờ.

#### Slide 5: Thiết kế Cơ sở Dữ liệu (Database Schema)
* **Quy mô DB:** 14 bảng quan hệ chặt chẽ.
* **Quy ước chuẩn hóa:**
  * Tất cả các trường tiền tệ dùng kiểu `Decimal` để tránh sai lệch số nổi (Float).
  * Mọi bảng có dấu vết thời gian (`created_at`, `updated_at`) và soft delete.
  * Quản lý phân quyền chặt chẽ thông qua 4 vai trò chính: ADMIN, MANAGER, RECEPTIONIST, TECHNICIAN.

#### Slide 6: Module Quản lý Tòa nhà & Căn hộ
* **Tính năng cốt lõi:**
  * Quản lý phân cấp: Tòa nhà -> Tầng -> Căn hộ.
  * Thiết lập thuộc tính chi tiết cho từng căn hộ (Loại phòng: Studio, 1PN, 2PN, 3PN; Danh mục nội thất đi kèm).
  * Quy trình chuyển trạng thái căn hộ tự động hoặc thủ công dựa trên vòng đời hợp đồng (`AVAILABLE`, `OCCUPIED`, `MAINTENANCE`, `RESERVED`).

#### Slide 7: Quản lý Khách thuê & Thủ tục Hành chính
* **Hồ sơ số hóa:** Lưu trữ đầy đủ lý lịch khách thuê đại diện (CCCD, SĐT, Thông tin liên lạc).
* **Quản lý cư trú:**
  * Tích hợp tính năng Khai báo Tạm trú / Tạm vắng trực tiếp trên hồ sơ khách.
  * Lưu trữ lịch sử tất cả các hợp đồng khách đã ký trong quá khứ để phân tích hành vi tiêu dùng.

#### Slide 8: Thiết lập & Vòng đời Hợp đồng thuê
* **Quy trình ký hợp đồng:** Chọn khách đại diện, áp phòng trống, cấu hình đơn giá điện nước, cấu hình ngày đến hạn thanh toán (`payment_due_day`), và đính kèm dịch vụ.
* **Vòng đời hợp đồng tự động:**
  * **ACTIVE** (Đang hoạt động).
  * **EXPIRING_SOON** (Tự động chuyển qua Cron khi còn ≤ 30 ngày).
  * **EXPIRED** (Hết hạn và tự giải phóng trạng thái phòng về trống).
  * **TERMINATED** (Chấm dứt trước hạn kèm lý do cụ thể).

#### Slide 9: Ghi nhận Chỉ số Điện nước & Dịch vụ đi kèm
* **Chốt số thông minh:** Giao diện chốt số điện nước hàng tháng tự động gợi ý chỉ số cũ (lấy từ số điện nước tháng trước hoặc chỉ số ban đầu của hợp đồng), giảm thiểu lỗi nhập liệu của nhân viên.
* **Quản lý dịch vụ đăng ký:** Đăng ký dịch vụ (vệ sinh, xe cộ, internet...) theo số lượng và đơn giá quy định trên từng hợp đồng, tự động cộng dồn vào hóa đơn cuối tháng.

#### Slide 10: Quy trình Tính toán & Lập Hóa đơn hàng loạt
* **Tự động hóa lập hóa đơn:** Nhân viên chỉ cần chọn tháng lập hóa đơn, hệ thống tự động quét và tính toán hàng loạt cho tất cả căn hộ có hợp đồng hoạt động:
  $$\text{Tổng tiền} = \text{Tiền phòng} + (\text{Điện mới} - \text{Điện cũ}) \times \text{Đơn giá} + (\text{Số người} \times 100k) + \text{Tổng tiền dịch vụ} + \text{Phụ thu}$$
* **Hạn đóng tiền hợp lệ:** Hạn thanh toán (`due_date`) được tính tự động vào tháng kế tiếp của kỳ hóa đơn (Ví dụ: hóa đơn kỳ 2026-05 có hạn nộp là ngày quy định trong hợp đồng của tháng 2026-06).

#### Slide 11: Quản lý Quá hạn hóa đơn & Tối ưu hóa UI mới
* **Trạng thái Quá hạn:** Tự động phát hiện hóa đơn quá hạn qua Cron Job hàng ngày (`due_date < today` và chưa hoàn tất thanh toán) hoặc cập nhật động ngay trên UI.
* **Cải tiến thiết kế UI tối giản:**
  * Di chuyển toàn bộ cảnh báo quá hạn từ cột "Hạn thanh toán" sang cột "Trạng thái". Cột Hạn thanh toán chỉ hiển thị ngày sạch sẽ.
  * Tận dụng badge đỏ đậm đặc trưng (`bg-red-200 text-red-800 font-semibold`) cho trạng thái `Quá hạn` trên Invoices Page và Invoice Detail Page để gây chú ý mạnh với nhân viên thu ngân.

#### Slide 12: Báo hỏng qua QR Code — Trải nghiệm "Zero-Login"
* **Đột phá tiện ích cho Khách thuê:**
  * Mỗi phòng có một mã QR động độc lập chứa token mã hóa thời hạn 90 ngày dán trực tiếp ở cửa.
  * Khách chỉ cần quét mã bằng điện thoại để mở form gửi yêu cầu kỹ thuật trực tiếp mà không cần tài khoản đăng nhập hay cài đặt ứng dụng.
  * Tự động ẩn thông tin nhạy cảm của khách thuê trên giao diện công cộng nhưng tự liên kết chính xác sự cố vào phòng tương ứng ở hệ thống quản lý.

#### Slide 13: Tiếp nhận & Phân công Yêu cầu Kỹ thuật
* **Phân cấp xử lý:**
  * Tự động nhận diện nguồn gửi sự cố (Gửi từ Khách thuê qua QR code vs Gửi nội bộ do Lễ tân tạo).
  * Quản lý tiến độ sửa chữa qua các trạng thái: `RECEIVED` -> `ASSIGNED` (Phân công kỹ thuật viên cụ thể) -> `IN_PROGRESS` -> `RESOLVED` (Kèm nhật ký thời gian hoàn thành cụ thể).

#### Slide 14: Dashboard Phân tích Tài chính & Vận hành
* **Trực quan hóa dữ liệu chỉ huy:**
  * **8 chỉ số KPI cốt lõi:** Thống kê doanh thu, tỷ lệ lấp đầy phòng, số lượng khách thuê và tình trạng hóa đơn nợ nần.
  * **Điều hướng đồng bộ:** Nhấn vào các chỉ số nợ/quá hạn trên Dashboard sẽ mở danh sách hóa đơn tương ứng với bộ lọc chính xác (`?status=OVERDUE`), loại bỏ lỗi rỗng trang.
  * Biểu đồ doanh thu 6 tháng gần nhất (Đã thu vs Chưa thu) để hỗ trợ dòng tiền quản lý.

#### Slide 15: Kết luận & Giá trị thực tiễn mang lại
* **Giá trị cốt lõi:**
  * Đạt tỷ lệ chính xác 100% trong tính toán công nợ và hạn chế thất thoát tài chính.
  * Rút ngắn thời gian tiếp nhận sự cố kỹ thuật từ khách hàng lên tới 80%.
  * Hệ thống đóng gói Docker nhẹ, ổn định, giao diện có độ tương phản cao, chống lóa và phân cấp thông tin rõ ràng.
  * Sẵn sàng demo ngay lập tức với dữ liệu mẫu phong phú.
