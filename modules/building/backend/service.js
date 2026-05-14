import { prisma } from '@my/prisma';

// ==========================================
// BUILDINGS
// ==========================================

export const getBuildings = async ({ page = 1, limit = 20, search }) => {
  const where = search
    ? {
        OR: [
          { name: { contains: search } },
          { code: { contains: search } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.buildings.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: 'desc' },
    }),
    prisma.buildings.count({ where }),
  ]);

  return { items, total, page, limit };
};

export const getBuildingById = async (id) => {
  return prisma.buildings.findUnique({
    where: { id },
    include: {
      floors: {
        orderBy: { floor_number: 'asc' },
      },
    },
  });
};

export const createBuilding = async (data) => {
  const existing = await prisma.buildings.findUnique({ where: { code: data.code } });
  if (existing) throw new Error(`Mã tòa nhà '${data.code}' đã tồn tại`);

  return prisma.buildings.create({ data });
};

export const updateBuilding = async (id, data) => {
  if (data.code) {
    const existing = await prisma.buildings.findUnique({ where: { code: data.code } });
    if (existing && existing.id !== id) throw new Error(`Mã tòa nhà '${data.code}' đã tồn tại`);
  }

  return prisma.buildings.update({
    where: { id },
    data,
  });
};

// ==========================================
// FLOORS
// ==========================================

export const getFloorsByBuildingId = async (buildingId) => {
  return prisma.floors.findMany({
    where: { building_id: buildingId },
    orderBy: { floor_number: 'asc' },
  });
};

export const bulkCreateFloors = async (buildingId, fromFloor, toFloor) => {
  if (fromFloor > toFloor) {
    throw new Error('Tầng bắt đầu không thể lớn hơn tầng kết thúc');
  }

  const building = await prisma.buildings.findUnique({ where: { id: buildingId } });
  if (!building) throw new Error('Không tìm thấy tòa nhà');

  const floorsToCreate = [];
  for (let i = fromFloor; i <= toFloor; i++) {
    floorsToCreate.push({
      building_id: buildingId,
      floor_number: i,
      description: `Tầng ${i}`,
    });
  }

  // createMany is supported by Prisma natively
  const result = await prisma.floors.createMany({
    data: floorsToCreate,
    skipDuplicates: true, // Tránh lỗi nếu tầng đã tồn tại
  });

  return result;
};

// ==========================================
// APARTMENTS
// ==========================================

export const getApartments = async ({ page = 1, limit = 20, status, building_id, floor_id, room_type }) => {
  const where = {};
  
  if (status) where.status = status;
  if (room_type) where.room_type = room_type;
  if (floor_id) {
    where.floor_id = floor_id;
  } else if (building_id) {
    where.floor = { building_id: building_id };
  }

  const [items, total] = await Promise.all([
    prisma.apartments.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { apartment_code: 'asc' },
      include: {
        floor: {
          include: { building: true }
        }
      }
    }),
    prisma.apartments.count({ where }),
  ]);

  return { items, total, page, limit };
};

export const getApartmentById = async (id) => {
  return prisma.apartments.findUnique({
    where: { id },
    include: {
      furniture: true,
      floor: {
        include: { building: true }
      }
    },
  });
};

export const createApartment = async (data) => {
  const existing = await prisma.apartments.findUnique({ where: { apartment_code: data.apartment_code } });
  if (existing) throw new Error(`Mã căn hộ '${data.apartment_code}' đã tồn tại`);

  return prisma.apartments.create({ data });
};

export const updateApartment = async (id, data) => {
  // Ngăn chặn update status qua hàm này
  const { status, ...updateData } = data;

  if (updateData.apartment_code) {
    const existing = await prisma.apartments.findUnique({ where: { apartment_code: updateData.apartment_code } });
    if (existing && existing.id !== id) throw new Error(`Mã căn hộ '${updateData.apartment_code}' đã tồn tại`);
  }

  return prisma.apartments.update({
    where: { id },
    data: updateData,
  });
};

export const updateApartmentStatus = async (id, newStatus, reason, changedBy) => {
  const apartment = await prisma.apartments.findUnique({ where: { id } });
  if (!apartment) throw new Error('Không tìm thấy căn hộ');

  const current = apartment.status;

  const validTransitions = {
    AVAILABLE:   ['OCCUPIED', 'RESERVED', 'MAINTENANCE'],
    OCCUPIED:    ['AVAILABLE'],
    MAINTENANCE: ['AVAILABLE'],
    RESERVED:    ['AVAILABLE', 'OCCUPIED'],
  };

  if (current === newStatus) {
    return apartment; // Không thay đổi gì
  }

  if (!validTransitions[current]?.includes(newStatus)) {
    throw new Error(`Không thể chuyển trạng thái từ ${current} sang ${newStatus}`);
  }

  // Prisma Transaction
  const [updatedApartment] = await prisma.$transaction([
    prisma.apartments.update({
      where: { id },
      data: { status: newStatus },
    }),
    prisma.apartmentStatusLogs.create({
      data: {
        apartment_id: id,
        old_status: current,
        new_status: newStatus,
        changed_by: changedBy,
        reason: reason || `Đổi trạng thái từ ${current} sang ${newStatus}`,
      },
    }),
  ]);

  return updatedApartment;
};

export const getApartmentStatusLogs = async (apartmentId) => {
  return prisma.apartmentStatusLogs.findMany({
    where: { apartment_id: apartmentId },
    orderBy: { changed_at: 'desc' },
    include: {
      user: {
        select: { id: true, full_name: true, email: true }
      }
    }
  });
};

// ==========================================
// FURNITURE
// ==========================================

export const getFurnitureByApartmentId = async (apartmentId) => {
  return prisma.apartmentFurniture.findMany({
    where: { apartment_id: apartmentId },
    orderBy: { created_at: 'desc' },
  });
};

export const addFurniture = async (apartmentId, data) => {
  return prisma.apartmentFurniture.create({
    data: {
      ...data,
      apartment_id: apartmentId,
    },
  });
};

export const updateFurniture = async (id, data) => {
  return prisma.apartmentFurniture.update({
    where: { id },
    data,
  });
};

export const deleteFurniture = async (id) => {
  return prisma.apartmentFurniture.delete({
    where: { id },
  });
};
