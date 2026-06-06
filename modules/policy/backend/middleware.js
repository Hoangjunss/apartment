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
      
      else if (resourceType === 'Warehouse') {
        const wh = await prisma.warehouses.findUnique({
          where: { id: resourceId },
          select: { building_id: true }
        });
        if (wh) entityBuildingId = wh.building_id;
      }
      
      else if (resourceType === 'Asset') {
        const asset = await prisma.assets.findUnique({
          where: { id: resourceId },
          select: { building_id: true }
        });
        if (asset) entityBuildingId = asset.building_id;
      }
      
      else if (resourceType === 'InventoryItem') {
        const item = await prisma.inventoryItems.findUnique({
          where: { id: resourceId },
          include: { warehouse: { select: { building_id: true } } }
        });
        if (item) entityBuildingId = item.warehouse.building_id;
      }
      
      else if (resourceType === 'Tenant') {
        const tenant = await prisma.tenants.findUnique({
          where: { id: resourceId },
          include: {
            contracts: {
              include: {
                apartment: {
                  include: {
                    floor: {
                      select: { building_id: true }
                    }
                  }
                }
              }
            }
          }
        });

        if (tenant) {
          if (tenant.contracts.length > 0) {
            const hasAccess = tenant.contracts.some(c =>
              assignedIds.includes(c.apartment.floor.building_id)
            );
            if (!hasAccess) {
              return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền truy cập thông tin khách thuê này'
              });
            }
          }
        }
        return next();
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

/**
 * Hàm kiểm tra quyền truy cập tòa nhà của một User cụ thể.
 * Ném lỗi nếu không có quyền.
 */
export const assertBuildingAccess = async (userId, role, buildingId) => {
  if (role === 'ADMIN') return;

  const assignment = await prisma.buildingAssignments.findFirst({
    where: {
      user_id: Number(userId),
      building_id: Number(buildingId),
      revoked_at: null,
      user: { is_active: true }
    }
  });

  if (!assignment) {
    throw new Error(`Bạn không có quyền truy cập tòa nhà này (ID: ${buildingId}).`);
  }
};

export const buildingGuard = (getBuildingId, options = { required: true }) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
      }

      if (user.role === 'ADMIN') {
        return next();
      }

      const bId = getBuildingId
        ? getBuildingId(req)
        : (req.params.buildingId || req.body.building_id || req.query.building_id);

      if (!bId) {
        if (options.required) {
          return res.status(400).json({ success: false, message: 'Thiếu thông tin tòa nhà (building_id)' });
        }
        return next();
      }

      const numericBuildingId = Number(bId);
      if (isNaN(numericBuildingId)) {
        return res.status(400).json({ success: false, message: 'Sai định dạng thông tin tòa nhà (building_id)' });
      }

      await assertBuildingAccess(user.userId, user.role, numericBuildingId);
      next();
    } catch (err) {
      res.status(403).json({ success: false, message: err.message });
    }
  };
};
