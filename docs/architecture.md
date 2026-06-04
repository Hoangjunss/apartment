# 🏛️ Kiến trúc Hệ thống (System Architecture)

Tài liệu này chi tiết hóa cấu trúc kỹ thuật của hệ thống QLCHDC, bao gồm kiến trúc phân tầng (Layered Architecture), kiến trúc hướng sự kiện (Event-Driven Architecture) và cơ chế đồng bộ real-time qua Socket.io.

---

## 📐 Kiến trúc Phân tầng (Layered Architecture)

Hệ thống được thiết kế theo mô hình phân tầng rõ rệt từ Client đến Database nhằm đảm bảo tính độc lập, dễ bảo trì và kiểm thử.

```mermaid
flowchart TD
    subgraph Tầng Trình diễn (Presentation Layer)
        FE[Frontend: React + Vite + TailwindCSS]
    end

    subgraph Tầng API & Routing (API Layer)
        Express[Express.js App Router]
        Middleware[Middlewares: Auth, RBAC, Policy Engine]
    end

    subgraph Tầng Nghiệp vụ (Business Service Layer)
        Service[Service Layer: Chứa Business Logic]
        EventHub[Event Hub: Phát sự kiện in-process]
    end

    subgraph Tầng Truy xuất Dữ liệu (Data Access Layer)
        Prisma[Prisma ORM Client]
    end

    subgraph Tầng Cơ sở Dữ liệu (Database Layer)
        MySQL[(MySQL Database)]
    end

    FE <-->|HTTP REST / WebSocket| Express
    Express --> Middleware
    Middleware --> Service
    Service --> EventHub
    Service <--> Prisma
    Prisma <--> MySQL
```

### Chi tiết các Tầng:
1. **Presentation Layer (React + Vite)**: Sử dụng Axios interceptor quản lý JWT token (Access 8h + Refresh 7d), sử dụng TanStack Query (React Query) để quản lý server state cache tại frontend.
2. **API & Routing Layer (Express.js)**: Định nghĩa các routes cho từng module. Áp dụng các middleware kiểm soát truy cập:
   - `auth`: Xác thực chữ ký JWT.
   - `requireRole`: Kiểm tra role cơ bản (RBAC).
   - `checkPolicy`: Áp dụng Policy-based permission để giới hạn dữ liệu theo tòa nhà được gán.
3. **Business Service Layer**: Chứa toàn bộ business logic nghiệp vụ của hệ thống. Đây là tầng duy nhất gọi Prisma Client và có trách nhiệm phát sự kiện (Events) sang Event Hub khi có thay đổi nghiệp vụ quan trọng.
4. **Data Access Layer (Prisma ORM)**: Tầng trừu tượng hóa truy vấn SQL, đảm bảo an toàn kiểu dữ liệu (type-safe) và quản lý quan hệ thực thể tự động.
5. **Database Layer (MySQL)**: Lưu trữ dữ liệu thực tế, áp dụng các ràng buộc khóa ngoại (Foreign Keys), Unique và các composite indexes tối ưu hóa truy vấn.

---

## 📡 Kiến trúc Hướng Sự kiện (Event-Driven Architecture)

Hệ thống sử dụng cơ chế phát và lắng nghe sự kiện (Event-Driven) in-process nhằm tách rời các luồng nghiệp vụ chính khỏi các tác vụ phụ trợ (ghi log lịch sử, cập nhật dòng thời gian, gửi thông báo).

```mermaid
flowchart TD
    Service[Service Layer] -->|Emit Event| EventHub[Event Hub]
    
    subgraph Listeners (Xử lý bất đồng bộ song song)
        EventHub -->|contract.created / invoice.paid / inventory.low_stock...| Audit[AuditLog Listener]
        EventHub -->|contract.created / invoice.paid / inventory.low_stock...| Timeline[Timeline Listener]
        EventHub -->|contract.created / invoice.paid / inventory.low_stock...| Notif[Notification Listener]
    end

    Audit -->|Tạo bản ghi độc lập| DB1[(AuditLogs Table)]
    Timeline -->|Cập nhật lịch sử| DB2[(Timeline Table)]
    Notif -->|Lưu thông báo| DB3[(Notifications Table)]
    Notif -->|Real-time Emit| Socket[Socket.io-client]
```

### Đặc tính thiết kế:
- **Non-blocking (Không chặn)**: Các Listener được bọc trong các khối `try/catch` riêng biệt. Nếu việc tạo thông báo hoặc ghi log audit gặp lỗi, giao dịch nghiệp vụ chính (như tạo hợp đồng, hoàn tất thanh toán, cập nhật kho) vẫn được cam kết thành công.
- **Tính năng phân rã (Decoupling)**: Khi thêm các yêu cầu phụ trợ mới (như gửi email, SMS, Zalo ZNS), chúng ta chỉ cần viết thêm một Listener đăng ký với Event Hub mà không phải sửa đổi code của Service nghiệp vụ chính.

### Mẫu payload sự kiện (`inventory.low_stock`):
```json
{
  "eventId": "evt_99182ac762f",
  "eventName": "inventory.low_stock",
  "timestamp": "2026-06-04T08:15:00Z",
  "actor": {
    "id": 15,
    "name": "Tran Van Tech",
    "role": "TECHNICIAN"
  },
  "data": {
    "itemId": 4,
    "itemName": "Van nước Inox",
    "currentStock": 1,
    "minStockLevel": 2,
    "buildingId": 1
  }
}
```

---

## 🔔 Đồng bộ Real-time (Socket.io)

Để nhân viên vận hành nhận được thông báo ngay lập tức khi phát sinh sự cố, gia hạn hợp đồng hay hóa đơn quá hạn, hệ thống tích hợp Socket.io:

1. Khi `Notification Listener` lưu thông báo mới vào bảng `Notifications`, nó đồng thời gọi Socket.io server.
2. Socket.io server xác định socket connection của người nhận (dựa trên userId đã đăng ký khi thiết lập kết nối) và thực hiện emit sự kiện `notification:received`.
3. Frontend Client lắng nghe sự kiện, hiển thị toast thông báo tức thì và tự động tăng số lượng thông báo chưa đọc trên biểu tượng chiếc chuông (`NotificationBell.jsx`).
