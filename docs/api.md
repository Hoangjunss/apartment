# 🔌 Danh sách API (API Summary)

Tài liệu này tóm tắt các endpoint REST API hiện có của hệ thống QLCHDC, được nhóm theo từng Module chức năng.

> [!TIP]
> **OpenAPI / Swagger Integration**:  
> Chi tiết tham số đầu vào (request body, query parameters) và dữ liệu đầu ra mẫu (response JSON) của hơn 70+ endpoints có thể được truy cập trực tiếp tại:
> - Local: [http://localhost:3001/api-docs](http://localhost:3001/api-docs) (khi chạy server backend).
> - Production: `/api-docs` trên tên miền đã deploy.
> 
> Việc sử dụng OpenAPI giúp tài liệu được tự động cập nhật từ mã nguồn, tránh bị lỗi thời so với code thực tế.

---

## 🔐 Auth & Staffs Module (`/api/auth`)

| Method | Route | Mô tả | Vai trò yêu cầu |
|--------|-------|-------|-----------------|
| POST | `/login` | Đăng nhập hệ thống, cấp Access Token & Refresh Token | Public |
| POST | `/refresh` | Dùng Refresh Token để gia hạn Access Token | Public |
| POST | `/logout` | Đăng xuất, hủy bỏ phiên làm việc | Đã đăng nhập |
| GET | `/me` | Lấy thông tin chi tiết của tài khoản đang đăng nhập | Đã đăng nhập |
| PUT | `/change-password` | Đổi mật khẩu tài khoản | Đã đăng nhập |
| GET | `/users` | Lấy danh sách toàn bộ nhân viên vận hành | ADMIN |
| POST | `/users` | Tạo tài khoản nhân viên mới | ADMIN |
| PUT | `/users/:id` | Cập nhật thông tin nhân viên | ADMIN |
| PATCH | `/users/:id/toggle-active` | Kích hoạt hoặc khóa tạm thời một tài khoản nhân viên | ADMIN |

---

## 🏢 Building & Apartments Module (`/api/building`)

| Method | Route | Mô tả | Vai trò yêu cầu |
|--------|-------|-------|-----------------|
| GET | `/buildings` | Lấy danh sách tòa nhà (lọc scope được gán) | Đã đăng nhập |
| GET | `/buildings/:id` | Xem chi tiết một tòa nhà | Đã đăng nhập |
| POST | `/buildings` | Tạo tòa nhà mới | ADMIN |
| PUT | `/buildings/:id` | Cập nhật thông tin tòa nhà | ADMIN, MANAGER |
| GET | `/buildings/:id/floors` | Danh sách tầng thuộc tòa nhà | Đã đăng nhập |
| POST | `/buildings/:id/floors` | Khởi tạo tầng cho tòa nhà | ADMIN, MANAGER |
| GET | `/apartments` | Lấy danh sách căn hộ (lọc theo tòa nhà gán) | Đã đăng nhập |
| GET | `/apartments/:id` | Xem chi tiết căn hộ, hợp đồng và khách đang ở | Đã đăng nhập |
| GET | `/apartments/:id/preview` | Xem nhanh thông tin căn hộ (hover preview) | Đã đăng nhập |
| POST | `/apartments` | Thêm căn hộ mới | ADMIN, MANAGER |
| PUT | `/apartments/:id` | Cập nhật thông tin căn hộ | ADMIN, MANAGER |
| PATCH | `/apartments/:id/status` | Đổi trạng thái thủ công (AVAILABLE $\leftrightarrow$ MAINTENANCE) | Đã đăng nhập |
| GET | `/apartments/:id/status-logs` | Xem lịch sử chuyển đổi trạng thái căn hộ | Đã đăng nhập |
| GET | `/apartments/:id/furniture` | Danh mục nội thất bàn giao | Đã đăng nhập |
| POST | `/apartments/:id/furniture` | Khai báo nội thất mới | Đã đăng nhập |
| PUT | `/furniture/:id` | Cập nhật tình trạng nội thất | Đã đăng nhập |
| DELETE | `/furniture/:id` | Xóa nội thất khỏi căn hộ | ADMIN |
| POST | `/apartments/:id/generate-token` | Sinh mã QR Token mới cho căn hộ (hạn 90 ngày) | ADMIN, MANAGER |

---

## 📝 Contract Module (`/api/contract`)

| Method | Route | Mô tả | Vai trò yêu cầu |
|--------|-------|-------|-----------------|
| GET | `/` | Danh sách toàn bộ hợp đồng (lọc scope tòa nhà) | ADMIN, MANAGER |
| GET | `/expiring-soon` | Hợp đồng sắp hết hiệu lực (kỳ hạn $\le$ 30 ngày) | ADMIN, MANAGER |
| GET | `/:id` | Chi tiết hợp đồng, dịch vụ đính kèm | ADMIN, MANAGER, RECEPTIONIST |
| POST | `/` | Tạo hợp đồng thuê mới, chuyển trạng thái căn hộ sang OCCUPIED | ADMIN, MANAGER |
| PUT | `/:id` | Cập nhật hợp đồng đang ACTIVE | ADMIN, MANAGER |
| PATCH | `/:id/terminate` | Chấm dứt hợp đồng trước hạn, giải phóng căn hộ | ADMIN, MANAGER |
| POST | `/:id/renew` | Gia hạn hợp đồng, đổi ngày kết thúc và tiền thuê mới | ADMIN, MANAGER |
| GET | `/:id/renewals` | Xem lịch sử các lần gia hạn hợp đồng | ADMIN, MANAGER |
| GET | `/:id/audit-history` | Xem lịch sử thay đổi thông tin của hợp đồng | ADMIN, MANAGER, RECEPTIONIST |

---

## ⚡ Utility Readings & Invoices Module (`/api/finance`)

| Method | Route | Mô tả | Vai trò yêu cầu |
|--------|-------|-------|-----------------|
| GET | `/utility-readings` | Danh sách chỉ số điện nước đã ghi | Đã đăng nhập |
| POST | `/utility-readings` | Ghi nhận chỉ số điện nước mới (không ghi trùng tháng) | ADMIN, MANAGER, RECEPTIONIST |
| GET | `/invoices` | Danh sách hóa đơn hàng tháng | Đã đăng nhập |
| GET | `/invoices/:id` | Chi tiết hóa đơn, các khoản thu và lịch sử thanh toán | Đã đăng nhập |
| POST | `/invoices/generate` | Khởi tạo hóa đơn tháng cho một hợp đồng, tự động offset ví dư | ADMIN, MANAGER |
| POST | `/invoices/:id/payments` | Ghi nhận thanh toán (tạo phiếu thu Payments), kết chuyển dư vào ví | ADMIN, MANAGER, RECEPTIONIST |
| GET | `/invoices/:id/payments` | Danh sách các lần thanh toán của hóa đơn | Đã đăng nhập |
| GET | `/dashboard/stats` | Trích xuất số liệu thống kê doanh thu và công nợ | ADMIN, MANAGER, RECEPTIONIST |

---

## 🛠️ Service Requests & Repairs Module (`/api/service-requests`)

| Method | Route | Mô tả | Vai trò yêu cầu |
|--------|-------|-------|-----------------|
| GET | `/` | Danh sách yêu cầu sửa chữa | Đã đăng nhập |
| GET | `/my` | Danh sách công việc được giao riêng cho Kỹ thuật viên | TECHNICIAN |
| GET | `/:id` | Chi tiết sự cố, bình luận trao đổi và chi phí phát sinh | Đã đăng nhập |
| POST | `/` | Nhân viên tạo yêu cầu sự cố trực tiếp | ADMIN, MANAGER, RECEPTIONIST |
| POST | `/public` | Khách quét mã QR gửi sự cố (chỉ cần Apartment Token hợp lệ) | Public Guest |
| PATCH | `/:id/assign` | Phân công Kỹ thuật viên xử lý yêu cầu | ADMIN, MANAGER |
| PATCH | `/:id/status` | Cập nhật tiến độ xử lý (PENDING $\rightarrow$ IN_PROGRESS $\rightarrow$ RESOLVED) | Đã đăng nhập (Technician chỉ được sửa việc của mình) |
| POST | `/:id/comments` | Bình luận trao đổi nội bộ trong sự cố | Đã đăng nhập |
| POST | `/:id/expenses` | Ghi nhận chi phí mua sắm vật tư thay thế cho sự cố | Đã đăng nhập |

---

## 📊 Other Modules

### 1. Building Expenses (`/api/expenses`)
- `GET /` & `POST /` & `PUT /:id` & `DELETE /:id`: Quản lý chi phí chi ra vận hành tòa nhà. ADMIN/MANAGER duyệt, có đính kèm hóa đơn.

### 2. Attachments Engine (`/api/attachments`)
- `POST /upload`: Upload file (biên bản hợp đồng, ảnh sự cố) lên Cloudinary qua luồng stream.

### 3. Business Rules Engine (`/api/rules`)
- `GET /` & `POST /` & `PUT /:id`: ADMIN quản lý rules.
- `POST /trigger-scan`: Chạy thủ công quét toàn bộ database theo điều kiện rules.

### 4. Workflow Engine (`/api/workflow`)
- `GET /workflows` & `POST /workflows/transitions`: ADMIN thiết lập quy trình chuyển trạng thái.

### 5. Policy Building Assignments (`/api/policy`)
- `POST /assignments`: Gán tòa nhà cho nhân viên.
- `PATCH /assignments/:id/revoke`: Thu hồi phân quyền quản lý tòa nhà.
- `GET /my-assignments`: Danh sách tòa nhà nhân viên hiện tại được quản lý.

### 6. Inventory & Warehouses Module (`/api/inventory`)
- `GET /warehouses`: Lấy danh sách kho hàng (lọc scope tòa nhà).
- `GET /warehouses/:id`: Xem chi tiết thông tin kho hàng.
- `POST /warehouses`: Khởi tạo kho hàng mới.
- `PUT /warehouses/:id`: Cập nhật thông tin kho hàng.
- `DELETE /warehouses/:id`: Xóa kho hàng.
- `GET /items`: Danh sách vật tư trong các kho.
- `GET /items/:id`: Xem chi tiết vật tư trong kho.
- `POST /items`: Thêm vật tư mới vào kho.
- `PUT /items/:id`: Cập nhật thông tin/giá vật tư.
- `DELETE /items/:id`: Xóa vật tư khỏi danh mục.
- `GET /transactions`: Nhật ký nhập xuất kho.
- `POST /transactions`: Ghi nhận giao dịch nhập/xuất kho (STOCK_IN / STOCK_OUT).

### 7. Assets Module (`/api/assets`)
- `GET /`: Danh sách tài sản cố định (lọc scope tòa nhà, bao gồm khấu hao động).
- `GET /:id`: Xem chi tiết tài sản (gồm thông số khấu hao, timeline và attachments).
- `GET /code/:code`: Tra cứu nhanh tài sản qua mã QR Code.
- `POST /`: Khởi tạo tài sản cố định mới.
- `PUT /:id`: Cập nhật thông tin tài sản.
- `DELETE /:id`: Xóa tài sản.
- `GET /:id/timeline`: Dòng thời gian lịch sử hoạt động của tài sản.
- `GET /:id/attachments`: Tệp đính kèm liên quan đến tài sản.
