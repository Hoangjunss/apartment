# 🔴 Nợ Kỹ thuật (Technical Debt)

Tài liệu này lưu trữ các điểm nợ kỹ thuật hiện có trong hệ thống QLCHDC, được phân loại theo mức độ ưu tiên xử lý (High, Medium, Low) cùng vị trí file và giải pháp đề xuất.

---

## 🔴 Mức độ Ưu tiên: HIGH (Cần xử lý sớm)

### 1. Hardcoded DB Transaction trong Lập Hóa đơn
- **Vấn đề**: Hàm `generateInvoice` tại [modules/finance/backend/service.js](../modules/finance/backend/service.js) xử lý cấn trừ ví dư và tạo hóa đơn qua các Prisma query riêng biệt, thiếu transaction hoàn chỉnh (Prisma `$transaction`). Nếu quá trình cập nhật ví dư thành công nhưng tạo hóa đơn thất bại, dữ liệu sẽ bị mất cân đối tài chính.
- **Giải pháp**: Gộp toàn bộ luồng cấn trừ ví dư và tạo hóa đơn vào trong `prisma.$transaction([])`.

### 2. Thiếu xác thực JWT cho Token QR của phòng
- **Vấn đề**: API `POST /api/service-requests/public` tại [modules/service-requests/backend/router.js](../modules/service-requests/backend/router.js) nhận `token` truyền trực tiếp qua body mà không ký (signature) hay mã hóa. Kẻ tấn công có thể đoán thử ngẫu nhiên (brute-force) mã token 8-16 ký tự để gửi yêu cầu giả mạo phá hoại hệ thống.
- **Giải pháp**: Token QR nên được ký dạng JWT ngắn gọn hoặc kiểm tra Rate Limiting chặt chẽ tại endpoint public này.

---

## 🟡 Mức độ Ưu tiên: MEDIUM (Nên xử lý trước khi Scale-up)

### 1. In-process Event Hub gây nghẽn tiến trình Node.js
- **Vấn đề**: `EventHub` tại [packages/events/index.js](../packages/events/index.js) hoạt động hoàn toàn in-process sử dụng Node.js `EventEmitter`. Nếu lượng sự kiện phát sinh lớn (khi chạy cron tạo hàng loạt hóa đơn), các listener đồng loạt hoạt động sẽ chiếm dụng CPU chính và làm tăng thời gian phản hồi (latency) của API.
- **Giải pháp**: Chuyển đổi `EventHub` sang dùng message broker ngoài như **Redis BullMQ** hoặc **RabbitMQ** để xử lý các background jobs một cách bất đồng bộ thực sự ở luồng riêng.

### 2. Thiếu cơ chế ghi đè hoặc dọn dẹp file cũ trên Cloudinary
- **Vấn đề**: Khi cập nhật Hợp đồng cũ bằng ảnh chụp Hợp đồng mới, hệ thống upload file mới lên Cloudinary nhưng không gọi API xóa file cũ tại [modules/attachments/backend/controller.js](../modules/attachments/backend/controller.js), gây lãng phí dung lượng lưu trữ đám mây.
- **Giải pháp**: Khi thay đổi tệp tin đính kèm, thực hiện gọi API Cloudinary SDK để xóa file cũ dựa trên `public_id`.

---

## 🟢 Mức độ Ưu tiên: LOW (Cải tiến chất lượng Code)

### 1. Trùng lặp code tính toán chỉ số Điện Nước
- **Vấn đề**: Logic so sánh chỉ số cũ/mới và tính toán tiền điện nước xuất hiện lặp lại ở cả [modules/finance/backend/service.js](../modules/finance/backend/service.js) và [modules/finance/backend/service.js](../modules/finance/backend/service.js).
- **Giải pháp**: Tách logic tính toán công thức điện nước ra một thư viện utils dùng chung trong monorepo.

### 2. Thiếu unit test cho Rules Engine
- **Vấn đề**: Rules engine là một module động, dễ phát sinh lỗi logic khi parse các câu lệnh điều kiện JSON phức tạp từ database, nhưng hiện tại hoàn toàn chưa có bộ kiểm thử tự động.
- **Giải pháp**: Viết unit test bằng Jest/Vitest cho bộ rules parser tại [modules/rules/backend/service.js](../modules/rules/backend/service.js).
