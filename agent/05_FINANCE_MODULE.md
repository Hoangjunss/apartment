# 💰 Module 05 — Quản lý Điện Nước & Hóa Đơn (Finance Module)

## 1. Tổng quan
Module này chịu trách nhiệm quản lý chỉ số điện nước (`UtilityReadings`), hóa đơn hàng tháng (`Invoices`) và thanh toán (`Payments`) của khách thuê căn hộ dịch vụ.

- **Thư mục Backend**: `modules/finance/backend/`
- **Thư mục Frontend**: `modules/finance/frontend/`

---

## 2. API Endpoints Thiết kế

### 2.1 Chỉ số Điện Nước (`/api/finance/utilities`)
| Method | Endpoint | Quyền hạn | Mô tả |
|--------|----------|-----------|-------|
| GET | `/api/finance/utilities` | Tất cả | Lấy danh sách ghi điện nước `?apartment_id=&month=` |
| POST | `/api/finance/utilities` | ADMIN, MANAGER, RECEPTIONIST | Ghi nhận chỉ số mới (chỉ số cuối kì cũ sẽ tự động làm đầu kì mới) |

### 2.2 Hóa đơn (`/api/finance/invoices`)
| Method | Endpoint | Quyền hạn | Mô tả |
|--------|----------|-----------|-------|
| GET | `/api/finance/invoices` | Tất cả | Lấy danh sách hóa đơn `?status=&contract_id=&billing_month=` |
| GET | `/api/finance/invoices/:id` | Tất cả | Chi tiết hóa đơn kèm theo thanh toán |
| POST | `/api/finance/invoices/generate` | ADMIN, MANAGER | Tự động tạo hóa đơn nháp cho căn hộ từ dữ liệu điện nước và dịch vụ của tháng |
| PATCH | `/api/finance/invoices/:id/status` | ADMIN, MANAGER | Đổi trạng thái hóa đơn (PAID, PARTIALLY_PAID, etc.) |

### 2.3 Thanh toán (`/api/finance/payments`)
| Method | Endpoint | Quyền hạn | Mô tả |
|--------|----------|-----------|-------|
| POST | `/api/finance/payments` | ADMIN, MANAGER, RECEPTIONIST | Ghi nhận phiếu thu / phiếu thanh toán mới cho hóa đơn |

---

## 3. Cấu trúc Tệp Backend (`modules/finance/backend`)

### 3.1 `package.json`
Khai báo tên workspace package `@my/finance-backend` và exports `./index.js`.

### 3.2 `service.js`
- `getUtilityReadings({ apartmentId, billingMonth })`: Tìm kiếm lịch sử ghi điện nước.
- `recordUtilityReading(data, userId)`: Lưu chỉ số điện và nước mới. Tự động kiểm tra chỉ số mới không được nhỏ hơn chỉ số cũ.
- `getInvoices({ status, contractId, billingMonth })`: Lấy danh sách hóa đơn phân trang.
- `getInvoiceById(id)`: Lấy chi tiết hóa đơn, bao gồm thông tin phòng, hợp đồng và lịch sử thanh toán.
- `generateInvoice(data, userId)`: Tính toán tiền điện, nước (dựa trên chỉ số chênh lệch), tiền phòng, tiền dịch vụ đăng ký và sinh hóa đơn.
- `recordPayment(data, userId)`: Ghi nhận thanh toán và tự động cập nhật trạng thái hóa đơn (PAID nếu thanh toán đủ, PARTIALLY_PAID nếu thiếu).

### 3.3 `controller.js`
Nhận và validate dữ liệu từ HTTP request, gọi service tương ứng và trả về định dạng `{ success: true, data }` hoặc mã lỗi HTTP phù hợp (400, 404, 409).

### 3.4 `router.js`
Khai báo và liên kết các endpoints với controller, gắn middleware `authenticate` và `requireRole` để phân quyền.

---

## 4. Cấu trúc Tệp Frontend (`modules/finance/frontend`)

### 4.1 `services/finance.api.js`
Hàm API gọi thông qua axios instance:
- `getUtilities(params)`
- `recordUtility(data)`
- `getInvoices(params)`
- `getInvoiceById(id)`
- `generateInvoice(data)`
- `recordPayment(data)`

### 4.2 `hooks/useFinance.js`
Wrapper React Query:
- `useUtilities(params)`
- `useRecordUtility()`
- `useInvoices(params)`
- `useInvoiceById(id)`
- `useGenerateInvoice()`
- `useRecordPayment()`

### 4.3 Các trang giao diện (`pages/`)
- **`UtilityReadingsPage.jsx`**: Giao diện ghi điện nước hàng tháng cho từng phòng. Có biểu mẫu ghi nhanh chỉ số mới.
- **`InvoicesPage.jsx`**: Danh sách hóa đơn của tất cả các căn hộ dịch vụ, hỗ trợ lọc theo trạng thái đóng tiền (UNPAID, PAID, etc.) và nút "Tạo hóa đơn tháng" hàng loạt.
- **`InvoiceDetailPage.jsx`**: Xem chi tiết hóa đơn (Chi tiết các khoản tiền: Tiền phòng, tiền điện, tiền nước, tiền dịch vụ). Hiển thị lịch sử các lần trả tiền và nút "Ghi nhận thanh toán" thu tiền của khách thuê.

### 4.4 Các biểu mẫu (`components/`)
- **`UtilityReadingForm.jsx`**: Modal nhập chỉ số điện, nước.
- **`PaymentForm.jsx`**: Modal nhập phiếu thu tiền (Số tiền, phương thức BANK_TRANSFER/CASH, ghi chú).
