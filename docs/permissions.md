# 🛡️ Ma trận Phân quyền & Bảo mật (Security & Permissions)

Tài liệu này chi tiết hóa ma trận phân quyền dựa trên Vai trò (RBAC) và cơ chế phân quyền dựa trên Chính sách (Policy-Based Access Control) theo phạm vi quản lý tòa nhà trong hệ thống QLCHDC.

---

## 📊 Ma trận Phân quyền (RBAC Matrix)

| Chức năng | ADMIN | MANAGER | RECEPTIONIST | TECHNICIAN |
|-----------|:---:|:---:|:---:|:---:|
| **Dashboard** (Full KPI & Charts) | ✅ | ✅ | ❌ | ❌ |
| **Dashboard** (HĐ hết hạn + Hóa đơn nợ) | — | — | ✅ | ❌ |
| **Dashboard** (Công việc được giao) | — | — | ❌ | ✅ |
| **Quản lý Tòa nhà & Căn hộ (CRUD)** | ✅ | ✅ | ❌ | ❌ |
| **Xem Tòa nhà & Căn hộ (Read-only)** | ✅ | ✅ | ✅ | ✅ |
| **Quản lý Khách thuê (CRUD)** | ✅ | ✅ | ✅ | ❌ |
| **Quản lý Hợp đồng (Tạo/Sửa/Hủy/Gia hạn)** | ✅ | ✅ | ❌ | ❌ |
| **Xem Hợp đồng (Read-only)** | ✅ | ✅ | ✅ | ❌ |
| **Ghi Chỉ số Điện Nước** | ✅ | ✅ | ✅ | ❌ |
| **Tạo & Quản lý Hóa đơn** | ✅ | ✅ | ❌ | ❌ |
| **Ghi nhận Phiếu thu (Thu tiền)** | ✅ | ✅ | ✅ | ❌ |
| **Xem Hóa đơn (Read-only)** | ✅ | ✅ | ✅ | ❌ |
| **Quản lý Nhân sự & Phân quyền (Users)** | ✅ | ❌ | ❌ | ❌ |
| **ServiceRequests: Tạo yêu cầu mới** | ✅ | ✅ | ✅ | ❌ |
| **ServiceRequests: Phân công & Xem tất cả** | ✅ | ✅ | ❌ | ❌ |
| **ServiceRequests: Cập nhật status việc được giao** | ✅ | ✅ | ❌ | ✅ |

---

## 🛡️ Cơ chế Phân quyền hai lớp (Two-Layer Security)

Hệ thống áp dụng cơ chế bảo mật nghiêm ngặt gồm 2 lớp kiểm tra tại backend cho mỗi request:

### Lớp 1: Role-Based Access Control (RBAC)
Kiểm tra vai trò (Role) của người dùng thông qua middleware `requireRole`:
```js
// Ví dụ tại router
router.post('/invoices/generate', auth, requireRole(['ADMIN', 'MANAGER']), generateInvoice);
router.get('/invoices', auth, requireRole(['ADMIN', 'MANAGER', 'RECEPTIONIST']), getInvoices);
```
Nếu vai trò của người dùng không nằm trong danh sách cho phép, API sẽ ngay lập tức trả về lỗi `403 Forbidden` mà không thực hiện thêm truy vấn database nào.

### Lớp 2: Policy-Based Access Control (Resource-Level Scope)
Sau khi vượt qua lớp RBAC, middleware `checkPolicy` sẽ kiểm tra xem tài khoản có quyền truy cập vào bản ghi dữ liệu cụ thể hay không dựa trên sự phân công tòa nhà:
- Mỗi nhân viên (MANAGER, RECEPTIONIST, TECHNICIAN) được gán quản lý một hoặc nhiều tòa nhà thông qua bảng `BuildingAssignments`.
- Khi thực hiện hành động trên một thực thể (ví dụ: Xem thông tin Hợp đồng, Cập nhật Hóa đơn), hệ thống sẽ tìm tòa nhà (`building_id`) liên quan đến thực thể đó.
- Hệ thống so khớp: Nếu `building_id` không nằm trong danh sách tòa nhà được gán của nhân viên $\rightarrow$ Từ chối truy cập (Trả về lỗi `403 Forbidden`).

**Mẫu Code kiểm tra Policy Scope trong Service Layer**:
```js
async function applyBuildingScope(user, queryConditions) {
  if (user.role === 'ADMIN') {
    return queryConditions; // ADMIN bypass tất cả scope kiểm tra
  }
  
  // Lấy danh sách tòa nhà nhân viên được gán
  const assignedBuildings = await prisma.buildingAssignments.findMany({
    where: { user_id: user.id, revoked_at: null },
    select: { building_id: true }
  });
  
  const buildingIds = assignedBuildings.map(ab => ab.building_id);
  
  // Áp dụng điều kiện lọc tự động vào câu lệnh SQL/Prisma
  return {
    ...queryConditions,
    building_id: { in: buildingIds }
  };
}
```

---

## 🔒 Bảo mật QR Token không Login (Apartment Tokens)

Đối với cổng tiếp nhận yêu cầu sửa chữa công cộng cho khách thuê:
1. Mỗi căn hộ được sinh một token ngẫu nhiên qua hàm `POST /apartments/:id/generate-token`.
2. Token này được chuyển đổi thành mã QR dán trong phòng của khách thuê.
3. Khi khách quét mã QR để gửi yêu cầu sự cố kỹ thuật, API `POST /api/service-requests/public` sẽ kiểm tra tính hợp lệ của token trong bảng `ApartmentTokens` (còn hoạt động và chưa quá hạn 90 ngày).
4. Nếu hợp lệ, yêu cầu được chấp nhận và tự động liên kết với đúng căn hộ và hợp đồng hoạt động của phòng đó mà khách thuê **không cần** phải tạo tài khoản hay đăng nhập.
