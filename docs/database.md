# 🗄️ Thiết kế Cơ sở Dữ liệu (Database Design)

Tài liệu này trình bày chi tiết cấu trúc cơ sở dữ liệu MySQL thông qua Prisma ORM của hệ thống QLCHDC, bao gồm các mô hình miền cốt lõi (Core Domain Models), mô hình bổ trợ (Supporting Models), mối quan hệ và các quy chuẩn thiết kế.

---

## 🔑 Thực thể Miền Cốt lõi (Core Domain Models)

Hệ thống lưu giữ 11 thực thể nghiệp vụ cốt lõi, quản lý vòng đời tài sản, khách thuê, hợp đồng và dòng tiền vận hành:

### 1. `Users` (Nhân viên vận hành)
- **Vai trò**: Lưu trữ thông tin tài khoản của nhân viên nội bộ tòa nhà.
- **Fields quan trọng**: `id` (Int PK), `email` (String UNIQUE), `password_hash` (mã hóa bcrypt), `role` (Enum: ADMIN, MANAGER, TECHNICIAN, RECEPTIONIST), `is_active` (Boolean - dùng khóa tài khoản).

### 2. `Buildings` (Tòa nhà) & `Floors` (Tầng)
- **Vai trò**: Đại diện cho tài sản bất động sản được quản lý.
- **Fields quan trọng**:
  - `Buildings`: `id` (Int PK), `code` (String UNIQUE), `name`, `deleted_at` (DateTime?).
  - `Floors`: `building_id` (Int FK), `floor_number` (Int). Khóa chính phức hợp `(building_id, floor_number)`.

### 3. `Apartments` (Căn hộ)
- **Vai trò**: Các đơn vị phòng cho thuê riêng biệt trong từng tầng của tòa nhà.
- **Fields quan trọng**: `id` (Int PK), `apartment_code` (String UNIQUE), `room_type` (STUDIO/ONE_BR/TWO_BR/THREE_BR), `base_price` (Decimal), `status` (AVAILABLE/OCCUPIED/MAINTENANCE/RESERVED), `deleted_at` (DateTime?).

### 4. `Tenants` (Khách thuê)
- **Vai trò**: Hồ sơ thông tin cá nhân của khách thuê căn hộ.
- **Fields quan trọng**: `id` (Int PK), `national_id` (CCCD/Passport UNIQUE), `date_of_birth`, `phone` (String UNIQUE), `nationality` (mặc định "Việt Nam"), `deleted_at` (DateTime?).

### 5. `Contracts` (Hợp đồng thuê)
- **Vai trò**: Liên kết pháp lý và tài chính giữa Khách thuê và Căn hộ trong một khoảng thời gian.
- **Fields quan trọng**: `id` (Int PK), `contract_code` (String UNIQUE), `tenant_id` (FK), `apartment_id` (FK), `start_date`, `end_date`, `monthly_rent` (Decimal), `deposit_amount` (Decimal), `status` (ACTIVE/EXPIRING_SOON/EXPIRED/TERMINATED), `soNguoiO` (Int), `deleted_at` (DateTime?).

### 6. `Invoices` (Hóa đơn hàng tháng)
- **Vai trò**: Yêu cầu thanh toán hàng tháng gửi đến khách thuê, tổng hợp từ tiền phòng và dịch vụ.
- **Fields quan trọng**: `id` (Int PK), `invoice_code` (String UNIQUE), `contract_id` (FK), `billing_month` (String YYYY-MM), `rent_amount` (Decimal), `electricity_amount` (Decimal), `water_amount` (Decimal), `service_amount` (Decimal), `credit_applied` (Decimal - số tiền cấn trừ ví dư), `debt_amount` (Decimal - nợ cũ cộng dồn), `total_amount` (Decimal - thực tế cần trả), `status` (UNPAID/PARTIALLY_PAID/PAID/OVERDUE), `due_date`, `deleted_at` (DateTime?).

### 7. `Payments` (Phiếu thu)
- **Vai trò**: Ghi nhận các giao dịch thanh toán thực tế của khách thuê cho hóa đơn.
- **Fields quan trọng**: `id` (Int PK), `invoice_id` (FK), `amount` (Decimal), `payment_method` (CASH/BANK_TRANSFER), `payment_date` (Date), `reference_number` (String?).

### 8. `UtilityReadings` (Chỉ số điện nước)
- **Vai trò**: Lưu trữ chỉ số đồng hồ điện nước đo đạc hàng tháng để làm căn cứ tính hóa đơn.
- **Fields quan trọng**: `id` (Int PK), `apartment_id` (FK), `billing_month` (String YYYY-MM), `electricity_prev`/`curr` (Decimal), `water_prev`/`curr` (Decimal - NULL nếu tính nước khoán), `electricity_unit_price` (Decimal).

### 9. `ServiceRequests` (Yêu cầu kỹ thuật/sự cố)
- **Vai trò**: Tiếp nhận phản ánh sự cố hỏng hóc từ phòng của khách và tiến trình sửa chữa.
- **Fields quan trọng**: `id` (Int PK), `apartment_id` (FK), `contract_id` (Int? FK), `type` (MAINTENANCE/CLEANING/COMPLAINT/OTHER), `priority` (LOW/NORMAL/HIGH/URGENT), `status` (PENDING/ASSIGNED/IN_PROGRESS/RESOLVED/CANCELLED/POSTPONED), `source` (INTERNAL/PUBLIC_FORM), `assigned_to` (Int? FK - Technicians), `resolved_at` (DateTime?).

### 10. `BuildingExpenses` (Chi phí tòa nhà)
- **Vai trò**: Quản lý chi phí đầu ra để vận hành tòa nhà (tiền sửa chữa lớn, bảo dưỡng chung, lương nhân viên...).
- **Fields quan trọng**: `id` (Int PK), `building_id` (FK), `category` (OPERATIONS/MAINTENANCE), `title`, `amount` (Decimal), `expense_date`, `status` (PENDING/PAID).

---

## 🛠️ Thực thể Bổ trợ (Supporting Models)

Các bảng bổ trợ phục vụ ghi chép lịch sử, cơ chế tự động hóa, tài liệu đính kèm, phân cấp quyền và ví số dư:

- **`AuditLogs`**: Ghi nhận dấu chân kiểm toán (Ai thực hiện hành động gì, dữ liệu cũ và dữ liệu mới dưới dạng JSON, IP Client).
- **`Notifications`**: Lưu lịch sử thông báo gửi đến từng tài khoản nhân viên.
- **`Timeline`**: Bản ghi dòng thời gian hoạt động của các thực thể cốt lõi (ví dụ Hợp đồng ký ngày nào, hóa đơn thanh toán ngày nào).
- **`Attachments`**: Lưu trữ URL hình ảnh/tài liệu đính kèm trên Cloudinary, liên kết polymorphic qua cặp `entity_type` + `entity_id`.
- **`BuildingAssignments`**: Phân chia quyền quản lý tòa nhà cho các Manager/Technician/Receptionist.
- **`BusinessRules`**: Lưu các cấu hình quy tắc nghiệp vụ động (VD: Số ngày gửi thông báo hết hạn, SLA xử lý sự cố).
- **`Workflows` / `WorkflowSteps` / `WorkflowTransitions`**: State machine kiểm soát luồng trạng thái của Hợp đồng và Sự cố.
- **`ContractCredits` / `CreditTransactions`**: Hệ thống ví dư của Hợp đồng. Quản lý số tiền khách thanh toán thừa và tự động khấu trừ vào hóa đơn kỳ kế tiếp.
- **`ApartmentFurniture`**: Theo dõi hiện trạng nội thất của từng căn hộ khi bàn giao.
- **`ApartmentStatusLogs`**: Lịch sử chuyển dịch trạng thái của căn hộ (AVAILABLE $\leftrightarrow$ OCCUPIED $\leftrightarrow$ MAINTENANCE).
- **`ApartmentTokens`**: Token 8-16 ký tự mã hóa an toàn dùng làm mã QR phòng cho khách quét gửi yêu cầu sửa chữa.

---

## 📐 Nguyên tắc Thiết kế Database (Design Patterns)

### 1. Chính sách Tiền tệ (Money Constraints)
- **Không dùng kiểu Float hoặc Double** cho tất cả các trường lưu trữ tiền bạc (như Rent, Deposit, Invoice Amount, Payment Amount).
- **Quy chuẩn**: Sử dụng kiểu `Decimal(15, 2)` (hoặc tương tự) để tránh sai số dấu phẩy động trong quá trình cộng dồn hóa đơn và thanh toán.

### 2. Xử lý Xóa mềm (Soft Delete)
- Các thực thể cốt lõi (`Buildings`, `Apartments`, `Tenants`, `Contracts`, `Invoices`, `BuildingExpenses`) áp dụng cơ chế Soft Delete.
- Thay vì sử dụng câu lệnh `DELETE`, hệ thống cập nhật trường `deleted_at = NOW()`. Các câu lệnh truy vấn nghiệp vụ luôn lọc thêm điều kiện `deleted_at: null` để đảm bảo dữ liệu lịch sử tài chính không bị phá vỡ.

### 3. Quy tắc Cascade (Xóa liên đới)
Để tránh dữ liệu rác (orphan records) trong DB, Prisma schema thiết lập chính sách `onDelete: Cascade` cho các bảng con phụ thuộc trực tiếp:
- Xóa `ServiceRequest` $\rightarrow$ Tự động xóa `ServiceRequestComments` và `ServiceRequestExpenses`.
- Xóa `Contract` $\rightarrow$ Tự động xóa `ContractCredits`, `CreditTransactions` và `ContractRenewals`.
- Xóa `Workflow` $\rightarrow$ Tự động xóa `WorkflowSteps` và `WorkflowTransitions`.

### 4. Tối ưu hóa Truy vấn (Composite Indexes)
Hệ thống sử dụng các chỉ mục phức hợp để tăng tốc độ phản hồi API cho các màn hình danh sách lớn:
```sql
CREATE INDEX idx_contract_status_end ON Contracts(status, end_date);
CREATE INDEX idx_apartment_building_status ON Apartments(floor_id, status);
CREATE INDEX idx_invoice_status_due ON Invoices(status, due_date);
CREATE INDEX idx_audit_resource ON AuditLogs(resource_type, resource_id);
```
