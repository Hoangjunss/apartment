import { prisma } from '@my/prisma';

// Lấy các Building ID mà user được phân công quản lý (và chưa bị thu hồi)
export const getAssignedBuildingIds = async (userId) => {
  const assignments = await prisma.buildingAssignments.findMany({
    where: {
      user_id: Number(userId),
      revoked_at: null
    },
    select: { building_id: true }
  });
  return assignments.map(a => a.building_id);
};

// Hàm helper dùng chung áp dụng Building Scope
export const applyBuildingScope = async (currentUser, prismaWhere = {}, resourceType) => {
  if (!currentUser) return prismaWhere;

  // ADMIN bypass hoàn toàn
  if (currentUser.role === 'ADMIN') {
    return prismaWhere;
  }

  // MANAGER, TECHNICIAN, RECEPTIONIST: lọc theo tòa nhà được gán hoạt động (revoked_at IS NULL)
  if (['MANAGER', 'TECHNICIAN', 'RECEPTIONIST'].includes(currentUser.role)) {
    const assignedIds = await getAssignedBuildingIds(currentUser.userId);

    // Nếu không được phân công tòa nhà nào, ta gán building_id = -1 để ép query trả về rỗng (bảo mật)
    const allowedBuildingIds = assignedIds.length > 0 ? assignedIds : [-1];

    switch (resourceType) {
      case 'Building':
        prismaWhere.id = { in: allowedBuildingIds };
        break;
      case 'BuildingExpense':
        prismaWhere.building_id = { in: allowedBuildingIds };
        break;
      case 'Apartment':
        prismaWhere.floor = {
          ...prismaWhere.floor,
          building_id: { in: allowedBuildingIds }
        };
        break;
      case 'Contract':
      case 'Invoice':
      case 'ServiceRequest':
        prismaWhere.apartment = {
          ...prismaWhere.apartment,
          floor: {
            ...prismaWhere.apartment?.floor,
            building_id: { in: allowedBuildingIds }
          }
        };
        break;
      default:
        console.warn(`[Policy] applyBuildingScope called with unsupported resource type: ${resourceType}`);
    }
  }

  return prismaWhere;
};

// Lấy danh sách toàn bộ assignments (dành cho Admin quản lý)
export const getAllAssignments = async () => {
  return prisma.buildingAssignments.findMany({
    include: {
      user: { select: { id: true, full_name: true, role: true, email: true } },
      building: { select: { id: true, name: true, code: true } },
      assigner: { select: { id: true, full_name: true } }
    },
    orderBy: { assigned_at: 'desc' }
  });
};

// Tạo phân công mới
export const assignBuilding = async (userId, buildingId, assignerId) => {
  const existing = await prisma.buildingAssignments.findFirst({
    where: {
      user_id: Number(userId),
      building_id: Number(buildingId),
      revoked_at: null
    }
  });

  if (existing) {
    throw new Error('Người dùng này đã được phân công quản lý tòa nhà này rồi');
  }

  return prisma.buildingAssignments.create({
    data: {
      user_id: Number(userId),
      building_id: Number(buildingId),
      assigned_by: Number(assignerId)
    }
  });
};

// Thu hồi phân công (soft revoke)
export const revokeAssignment = async (assignmentId) => {
  const assignment = await prisma.buildingAssignments.findUnique({
    where: { id: Number(assignmentId) }
  });

  if (!assignment) {
    throw new Error('Không tìm thấy bản ghi phân công');
  }

  return prisma.buildingAssignments.update({
    where: { id: Number(assignmentId) },
    data: { revoked_at: new Date() }
  });
};
