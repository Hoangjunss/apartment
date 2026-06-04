import { prisma } from '@my/prisma';
import { getAssignedBuildingIds } from './service.js';

// Middleware kiểm tra quyền truy cập chi tiết (Resource-level policy)
export const checkPolicy = (resourceType, action) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
      }

      // ADMIN bypass hoàn toàn
      if (user.role === 'ADMIN') {
        return next();
      }

      const resourceId = Number(req.params.id);
      if (!resourceId) {
        return next(); // Không có ID cụ thể thì chuyển sang GET list (lọc riêng ở service)
      }

      const assignedIds = await getAssignedBuildingIds(user.userId);

      // Lấy building_id tương ứng với thực thể cụ thể
      let entityBuildingId = null;

      if (resourceType === 'Building') {
        entityBuildingId = resourceId;
      } 
      
      else if (resourceType === 'BuildingExpense') {
        const expense = await prisma.buildingExpenses.findUnique({
          where: { id: resourceId },
          select: { building_id: true }
        });
        if (expense) entityBuildingId = expense.building_id;
      } 
      
      else if (resourceType === 'Apartment') {
        const apt = await prisma.apartments.findUnique({
          where: { id: resourceId },
          include: { floor: { select: { building_id: true } } }
        });
        if (apt) entityBuildingId = apt.floor.building_id;
      } 
      
      else if (resourceType === 'Contract') {
        const contract = await prisma.contracts.findUnique({
          where: { id: resourceId },
          include: { apartment: { include: { floor: { select: { building_id: true } } } } }
        });
        if (contract) entityBuildingId = contract.apartment.floor.building_id;
      } 
      
      else if (resourceType === 'Invoice') {
        const invoice = await prisma.invoices.findUnique({
          where: { id: resourceId },
          include: { apartment: { include: { floor: { select: { building_id: true } } } } }
        });
        if (invoice) entityBuildingId = invoice.apartment.floor.building_id;
      } 
      
      else if (resourceType === 'ServiceRequest') {
        const sr = await prisma.serviceRequests.findUnique({
          where: { id: resourceId },
          include: { apartment: { include: { floor: { select: { building_id: true } } } } }
        });
        if (sr) entityBuildingId = sr.apartment.floor.building_id;
      }

      // Kiểm tra xem building_id của thực thể có thuộc danh sách tòa nhà được gán
      if (entityBuildingId !== null && !assignedIds.includes(entityBuildingId)) {
        return res.status(403).json({
          success: false,
          message: `Bạn không có quyền truy cập tài nguyên này (thuộc tòa nhà #${entityBuildingId} không được phân công).`
        });
      }

      next();
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  };
};
