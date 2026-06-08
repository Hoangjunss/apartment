import { prisma } from '@my/prisma';

// Lấy các Building ID mà user được phân công quản lý (và chưa bị thu hồi), đồng thời user phải đang hoạt động (active)
export const getAssignedBuildingIds = async (userId) => {
  const assignments = await prisma.buildingAssignments.findMany({
    where: {
      user_id: Number(userId),
      revoked_at: null,
      user: { is_active: true, deleted_at: null },
      building: { deleted_at: null }
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

    const resolveBuildingFilter = (existingFilter) => {
      if (existingFilter !== undefined && existingFilter !== null) {
        if (typeof existingFilter === 'number') {
          return allowedBuildingIds.includes(existingFilter) ? existingFilter : -1;
        }
        if (typeof existingFilter === 'object') {
          if (existingFilter.in && Array.isArray(existingFilter.in)) {
            const intersected = existingFilter.in.map(Number).filter(id => allowedBuildingIds.includes(id));
            return { in: intersected.length > 0 ? intersected : [-1] };
          }
          if (existingFilter.equals !== undefined) {
            const num = Number(existingFilter.equals);
            return allowedBuildingIds.includes(num) ? num : -1;
          }
        }
        const num = Number(existingFilter);
        if (!isNaN(num)) {
          return allowedBuildingIds.includes(num) ? num : -1;
        }
      }
      return { in: allowedBuildingIds };
    };

    switch (resourceType) {
      case 'Building':
        prismaWhere.id = resolveBuildingFilter(prismaWhere.id);
        break;
      case 'BuildingExpense':
        prismaWhere.building_id = resolveBuildingFilter(prismaWhere.building_id);
        break;
      case 'Apartment':
        prismaWhere.floor = {
          ...prismaWhere.floor,
          building_id: resolveBuildingFilter(prismaWhere.floor?.building_id)
        };
        break;
      case 'Contract':
      case 'Invoice':
      case 'ServiceRequest':
      case 'UtilityReading':
      case 'TemporaryRegistration':
        prismaWhere.apartment = {
          ...prismaWhere.apartment,
          floor: {
            ...prismaWhere.apartment?.floor,
            building_id: resolveBuildingFilter(prismaWhere.apartment?.floor?.building_id)
          }
        };
        break;
      case 'Warehouse':
      case 'Asset':
        prismaWhere.building_id = resolveBuildingFilter(prismaWhere.building_id);
        break;
      case 'InventoryItem':
        prismaWhere.warehouse = {
          ...prismaWhere.warehouse,
          building_id: resolveBuildingFilter(prismaWhere.warehouse?.building_id)
        };
        break;
      case 'Tenant':
        prismaWhere.OR = [
          {
            contracts: {
              some: {
                apartment: {
                  floor: {
                    building_id: { in: allowedBuildingIds }
                  }
                }
              }
            }
          },
          {
            contracts: {
              none: {}
            }
          }
        ];
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
    where: {
      building: { deleted_at: null },
      user: { deleted_at: null }
    },
    include: {
      user: { select: { id: true, full_name: true, role: true, email: true } },
      building: { select: { id: true, name: true, code: true } },
      assigner: { select: { id: true, full_name: true } }
    },
    orderBy: { assigned_at: 'desc' }
  });
};

// Tạo phân công mới (hỗ trợ phân công nhiều tòa nhà cùng lúc và khóa dòng chống race condition)
export const assignBuildings = async (userId, buildingIds, assignerId, notes) => {
  return prisma.$transaction(async (tx) => {
    // Khóa dòng user tương ứng để tuần tự hóa các request gán đồng thời
    await tx.$executeRaw`SELECT id FROM Users WHERE id = ${Number(userId)} FOR UPDATE`;

    const existing = await tx.buildingAssignments.findMany({
      where: {
        user_id: Number(userId),
        building_id: { in: buildingIds.map(Number) },
        revoked_at: null
      }
    });

    if (existing.length > 0) {
      const assignedIds = existing.map(e => e.building_id);
      throw new Error(`Người dùng này đã được phân công quản lý tòa nhà (ID: ${assignedIds.join(', ')}) rồi`);
    }

    const creations = buildingIds.map(buildingId =>
      tx.buildingAssignments.create({
        data: {
          user_id: Number(userId),
          building_id: Number(buildingId),
          assigned_by: Number(assignerId),
          notes: notes || null
        }
      })
    );

    return Promise.all(creations);
  });
};

// Thu hồi phân công (soft revoke) kèm lý do thu hồi
export const revokeAssignment = async (assignmentId, notes) => {
  const assignment = await prisma.buildingAssignments.findUnique({
    where: { id: Number(assignmentId) }
  });

  if (!assignment) {
    throw new Error('Không tìm thấy bản ghi phân công');
  }

  const updatedNotes = notes
    ? (assignment.notes ? `${assignment.notes} | Lý do thu hồi: ${notes}` : `Lý do thu hồi: ${notes}`)
    : assignment.notes;

  return prisma.buildingAssignments.update({
    where: { id: Number(assignmentId) },
    data: {
      revoked_at: new Date(),
      notes: updatedNotes
    }
  });
};
