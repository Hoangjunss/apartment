# 🌐 Tổng quan Hệ thống (System Overview)

Tài liệu này cung cấp cái nhìn tổng quan về mặt nghiệp vụ của Hệ thống Quản lý Căn hộ Dịch vụ (QLCHDC), bao gồm các đối tượng tham gia, các ca sử dụng (use cases), thực thể nghiệp vụ chính, và sơ đồ ngữ cảnh hệ thống.

---

## 👥 Đối tượng sử dụng (Actors)

Hệ thống QLCHDC được thiết kế để phục vụ đội ngũ vận hành nội bộ của tòa nhà. Khách thuê không cần tài khoản đăng nhập mà chỉ tương tác qua cổng công cộng (mã QR):

| Actor | Vai trò & Trách nhiệm chính |
|-------|----------------------------|
| **ADMIN (Quản trị viên)** | Toàn quyền kiểm soát hệ thống: quản lý tài khoản nhân viên, cấu hình quy tắc nghiệp vụ động (Rules Engine), thiết lập quy trình trạng thái (Workflow Engine). |
| **MANAGER (Quản lý)** | Vận hành hàng ngày: CRUD tòa nhà/căn hộ/hợp đồng/hóa đơn, phân công yêu cầu kỹ thuật, duyệt chi phí vận hành. |
| **RECEPTIONIST (Lễ tân)** | Tương tác trực tiếp với khách thuê: quản lý hồ sơ khách, ghi nhận chỉ số điện nước, thu tiền lập phiếu thu, tiếp nhận phản ánh sự cố kỹ thuật. |
| **TECHNICIAN (Kỹ thuật viên)** | Xử lý các sự cố kỹ thuật: tiếp nhận công việc được gán, cập nhật trạng thái sửa chữa, ghi nhận chi phí vật tư phát sinh. |
| **KHÁCH THUÊ (Public Guest)** | Tương tác gián tiếp: quét mã QR tại phòng để phản ánh sự cố kỹ thuật mà không cần đăng nhập. |

---

## 🎯 Các Ca sử dụng chính (Key Use Cases)

```mermaid
usecaseDiagram
    actor Admin as "ADMIN"
    actor Manager as "MANAGER"
    actor Receptionist as "RECEPTIONIST"
    actor Tech as "TECHNICIAN"
    actor Tenant as "KHÁCH THUÊ (Public)"

    Admin --> (Quản lý Nhân sự & Phân quyền)
    Admin --> (Cấu hình Rules & Workflow Engine)
    
    Manager --> (CRUD Tòa nhà & Căn hộ)
    Manager --> (Ký & Gia hạn Hợp đồng)
    Manager --> (Lập Hóa đơn & Duyệt Chi phí)
    Manager --> (Phân công Yêu cầu kỹ thuật)
    
    Receptionist --> (Quản lý Hồ sơ Khách thuê)
    Receptionist --> (Ghi Chỉ số Điện Nước)
    Receptionist --> (Lập Phiếu thu / Thu tiền)
    Receptionist --> (Ghi nhận Sự cố kỹ thuật)
    
    Tech --> (Xem việc được phân công)
    Tech --> (Cập nhật trạng thái sửa chữa)
    Tech --> (Khai báo chi phí sửa chữa)
    
    Tenant --> (Quét QR gửi yêu cầu sự cố)
```

---

## 🏛️ Tổng quan Miền nghiệp vụ (Domain Overview)

Nghiệp vụ cốt lõi xoay quanh vòng đời của một **Căn hộ (Apartment)** và **Hợp đồng thuê (Contract)**:

1. **Thiết lập hạ tầng**:
   - Một **Tòa nhà (Building)** gồm nhiều **Tầng (Floor)**.
   - Mỗi Tầng có nhiều **Căn hộ (Apartment)**.
2. **Thiết lập cư trú**:
   - **Khách thuê (Tenant)** đăng ký thông tin cá nhân (CCCD, SĐT...).
   - **Hợp đồng thuê (Contract)** được ký kết, liên kết Khách thuê với Căn hộ trống. Lúc này Căn hộ chuyển từ `AVAILABLE` sang `OCCUPIED`.
3. **Vận hành & Tài chính hàng tháng**:
   - Hàng tháng, ghi nhận **Chỉ số điện nước (UtilityReadings)**.
   - Hệ thống tính toán và tự động lập **Hóa đơn (Invoice)**.
   - Thực hiện cấn trừ **Ví dư (ContractCredits)** nếu có tiền đóng dư từ tháng trước.
   - Ghi nhận **Phiếu thu (Payment)** khi khách đóng tiền phòng. Tiền đóng thừa sẽ được nạp ngược lại vào Ví dư.
4. **Bảo trì & Sự cố kỹ thuật**:
   - Khách thuê hoặc Lễ tân phản ánh sự cố tạo thành **Yêu cầu kỹ thuật (ServiceRequest)**.
   - Quản lý phân công Kỹ thuật viên xử lý. Phát sinh vật tư được ghi nhận vào chi phí sửa chữa.

---

## 🔗 Sơ đồ Ngữ cảnh (System Context Diagram)

Sơ đồ dưới đây mô tả cách hệ thống QLCHDC tương tác với các nhân viên vận hành, khách thuê và các dịch vụ bên thứ ba:

```mermaid
flowchart TD
    subgraph Hệ thống QLCHDC
        Backend[Backend Express.js API]
        Database[(MySQL Database)]
        EventHub[Event Hub]
        
        Backend <--> Database
        Backend --> EventHub
    end

    Admin([Admin]) <-->|Thao tác hệ thống & cấu hình rules| Backend
    Manager([Manager]) <-->|Quản lý tòa nhà, hợp đồng, duyệt chi phí| Backend
    Receptionist([Receptionist]) <-->|Ghi điện nước, thu tiền, hồ sơ khách| Backend
    Tech([Technician]) <-->|Nhận việc, cập nhật tiến độ| Backend
    
    Tenant([Khách thuê]) -->|Quét QR phòng gửi sự cố| Backend
    
    Cloudinary[Cloudinary Cloud Storage] <-->|Tải lên & Lưu trữ CCCD, Hợp đồng ký, Ảnh sự cố| Backend
    BrowserClient[Web Browser] <-->|Kết nối Socket.io nhận thông báo real-time| Backend
```
