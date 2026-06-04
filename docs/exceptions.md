# ⚠️ Danh mục Lỗi Hệ thống (Exception Catalog)

Hệ thống QLCHDC định nghĩa một danh mục lỗi thống nhất nhằm trả về thông báo lỗi rõ ràng cho phía Client và hỗ trợ đắc lực trong việc debug hệ thống.

---

## 📋 Cấu trúc Response lỗi thống nhất

Khi xảy ra lỗi nghiệp vụ hoặc kỹ thuật, Backend luôn trả về JSON response theo định dạng chuẩn:
```json
{
  "success": false,
  "errorCode": "INVOICE_ALREADY_EXISTS_FOR_MONTH",
  "message": "Hợp đồng này đã được lập hóa đơn cho kỳ tháng 2026-06."
}
```

---

## 🗂️ Tra cứu Mã lỗi (Exception Codes Lookup)

Dưới đây là danh mục 25 lỗi nghiệp vụ thường gặp trong hệ thống:

| Mã lỗi (Error Code) | HTTP Status | Nguyên nhân & Ngữ cảnh xảy ra |
|---------------------|:---:|-------------------------------|
| **Xác thực & Tài khoản (Auth)** | | |
| `AUTH_INVALID_CREDENTIALS` | `401` | Sai tài khoản hoặc mật khẩu khi đăng nhập. |
| `AUTH_ACCOUNT_LOCKED` | `401` | Tài khoản nhân viên đã bị khóa (is_active = false). |
| `AUTH_TOKEN_EXPIRED` | `401` | Access Token hết hiệu lực, yêu cầu làm mới. |
| `AUTH_TOKEN_INVALID` | `401` | Token không hợp lệ hoặc chữ ký JWT sai. |
| **Phân quyền & Chính sách (Permissions)** | | |
| `RBAC_FORBIDDEN_ROLE` | `403` | Vai trò của tài khoản không được phép thực thi API này. |
| `POLICY_FORBIDDEN_BUILDING` | `403` | Nhân viên cố gắng truy cập dữ liệu thuộc tòa nhà mình không được gán quản lý. |
| **Quản lý Tòa nhà & Căn hộ (Building)** | | |
| `BUILDING_NOT_FOUND` | `404` | Không tìm thấy tòa nhà với ID cung cấp. |
| `APARTMENT_NOT_FOUND` | `404` | Không tìm thấy căn hộ với ID cung cấp. |
| `APARTMENT_ALREADY_OCCUPIED` | `400` | Cố gắng ký hợp đồng mới trên căn hộ đang có khách thuê. |
| `APARTMENT_TOKEN_EXPIRED` | `400` | QR Token của căn hộ đã hết hạn (quá 90 ngày). |
| **Quản lý Hợp đồng & Khách (Contract & Tenant)** | | |
| `TENANT_NOT_FOUND` | `404` | Không tìm thấy hồ sơ khách thuê. |
| `CONTRACT_NOT_FOUND` | `404` | Không tìm thấy hợp đồng được chỉ định. |
| `CONTRACT_ALREADY_TERMINATED` | `400` | Cố gắng thao tác/cập nhật trên hợp đồng đã thanh lý. |
| `CONTRACT_DATE_INVALID` | `400` | Ngày kết thúc (`end_date`) nhỏ hơn hoặc bằng ngày bắt đầu (`start_date`). |
| **Tài chính & Ví dư (Finance & Credit)** | | |
| `UTILITY_READING_DUPLICATE` | `409` | Đã tồn tại chỉ số điện nước ghi nhận cho căn hộ này trong kỳ tháng hiện tại. |
| `UTILITY_READING_INVALID` | `400` | Chỉ số mới nhỏ hơn chỉ số cũ đã ghi trước đó. |
| `INVOICE_NOT_FOUND` | `404` | Không tìm thấy hóa đơn. |
| `INVOICE_ALREADY_EXISTS_FOR_MONTH` | `409` | Hợp đồng này đã được lập hóa đơn trong kỳ tháng được chọn. |
| `INVOICE_PAID_ALREADY` | `400` | Hóa đơn đã được thanh toán đầy đủ, không thể tạo thêm phiếu thu. |
| `CREDIT_INSUFFICIENT` | `400` | Số dư ví của hợp đồng không đủ để thực hiện giao dịch khấu trừ yêu cầu. |
| **Sự cố Kỹ thuật (Service Request)** | | |
| `SERVICE_REQUEST_NOT_FOUND` | `404` | Không tìm thấy yêu cầu sửa chữa sự cố kỹ thuật. |
| `SERVICE_REQUEST_FORBIDDEN_UPDATE` | `403` | Kỹ thuật viên (Technician) cố gắng sửa phiếu sự cố của người khác. |
| **Hệ thống Workflow & Rules** | | |
| `WORKFLOW_TRANSITION_INVALID` | `400` | Chuyển đổi trạng thái không hợp lệ trong Workflow (VD: PENDING $\rightarrow$ RESOLVED mà không qua ASSIGNED). |
| `RULE_EVALUATION_FAILED` | `500` | Lỗi xảy ra khi Business Rules Engine đánh giá các điều kiện động từ Database. |
| **Khác (System & File)** | | |
| `FILE_UPLOAD_FAILED` | `400` | Lỗi trong quá trình upload file chứng từ lên Cloudinary (kích thước quá lớn, định dạng sai). |
