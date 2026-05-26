import { prisma } from '@my/prisma';

export const getBuildings = async () => {
  return prisma.buildings.findMany({
    orderBy: { id: 'desc' }
  });
};

export const getBuildingById = async (id) => {
  const building = await prisma.buildings.findUnique({
    where: { id: parseInt(id) },
    include: {
      floors: {
        orderBy: { floor_number: 'asc' }
      }
    }
  });
  if (!building) throw new Error('Không tìm thấy tòa nhà');
  return building;
};

export const createBuilding = async (data) => {
  // Check code unique
  const existing = await prisma.buildings.findUnique({
    where: { code: data.code }
  });
  if (existing) throw new Error(`Mã tòa nhà '${data.code}' đã tồn tại`);

  return prisma.buildings.create({
    data: {
      code: data.code,
      name: data.name,
      address: data.address,
      total_floors: parseInt(data.total_floors),
      description: data.description
    }
  });
};

export const updateBuilding = async (id, data) => {
  const building = await prisma.buildings.findUnique({
    where: { id: parseInt(id) }
  });
  if (!building) throw new Error('Không tìm thấy tòa nhà');

  if (data.code && data.code !== building.code) {
    const existing = await prisma.buildings.findUnique({
      where: { code: data.code }
    });
    if (existing) throw new Error(`Mã tòa nhà '${data.code}' đã tồn tại`);
  }

  return prisma.buildings.update({
    where: { id: parseInt(id) },
    data: {
      code: data.code,
      name: data.name,
      address: data.address,
      total_floors: data.total_floors ? parseInt(data.total_floors) : undefined,
      description: data.description
    }
  });
};

export const getFloorsByBuilding = async (buildingId) => {
  return prisma.floors.findMany({
    where: { building_id: parseInt(buildingId) },
    orderBy: { floor_number: 'asc' }
  });
};

export const bulkCreateFloors = async (buildingId, { from_floor, to_floor }) => {
  const bId = parseInt(buildingId);
  const from = parseInt(from_floor);
  const to = parseInt(to_floor);

  if (isNaN(from) || isNaN(to) || from > to) {
    throw new Error('Số tầng bắt đầu và kết thúc không hợp lệ (từ <= đến)');
  }

  const building = await prisma.buildings.findUnique({
    where: { id: bId }
  });
  if (!building) throw new Error('Không tìm thấy tòa nhà');

  // Check if any floor in this range already exists
  const existingFloors = await prisma.floors.findMany({
    where: {
      building_id: bId,
      floor_number: { gte: from, lte: to }
    }
  });

  const existingNums = existingFloors.map(f => f.floor_number);
  const floorsToCreate = [];

  for (let i = from; i <= to; i++) {
    if (!existingNums.includes(i)) {
      floorsToCreate.push({
        building_id: bId,
        floor_number: i,
        description: `Tầng ${i}`
      });
    }
  }

  if (floorsToCreate.length > 0) {
    await prisma.floors.createMany({
      data: floorsToCreate
    });
  }

  return prisma.floors.findMany({
    where: { building_id: bId },
    orderBy: { floor_number: 'asc' }
  });
};

export const getApartments = async ({ status, building_id, floor_id, room_type, page = 1, limit = 20 }) => {
  const where = {};
  if (status) where.status = status;
  if (room_type) where.room_type = room_type;
  
  if (floor_id) {
    where.floor_id = parseInt(floor_id);
  } else if (building_id) {
    where.floor = {
      building_id: parseInt(building_id)
    };
  }

  const p = parseInt(page);
  const l = parseInt(limit);

  const [items, total] = await Promise.all([
    prisma.apartments.findMany({
      where,
      skip: (p - 1) * l,
      take: l,
      orderBy: { apartment_code: 'asc' },
      include: {
        floor: {
          include: { building: true }
        }
      }
    }),
    prisma.apartments.count({ where })
  ]);

  return { items, total, page: p, limit: l };
};

export const getApartmentById = async (id) => {
  const apartment = await prisma.apartments.findUnique({
    where: { id: parseInt(id) },
    include: {
      floor: {
        include: { building: true }
      },
      furniture: true
    }
  });
  if (!apartment) throw new Error('Không tìm thấy căn hộ');
  return apartment;
};

export const createApartment = async (data) => {
  const existing = await prisma.apartments.findUnique({
    where: { apartment_code: data.apartment_code }
  });
  if (existing) throw new Error(`Mã căn hộ '${data.apartment_code}' đã tồn tại`);

  return prisma.apartments.create({
    data: {
      floor_id: parseInt(data.floor_id),
      apartment_code: data.apartment_code,
      room_type: data.room_type,
      area_sqm: data.area_sqm,
      max_occupants: parseInt(data.max_occupants),
      base_price: data.base_price,
      deposit_amount: data.deposit_amount,
      description: data.description,
      status: data.status || 'AVAILABLE'
    }
  });
};

export const updateApartment = async (id, data) => {
  const apartment = await prisma.apartments.findUnique({
    where: { id: parseInt(id) }
  });
  if (!apartment) throw new Error('Không tìm thấy căn hộ');

  if (data.apartment_code && data.apartment_code !== apartment.apartment_code) {
    const existing = await prisma.apartments.findUnique({
      where: { apartment_code: data.apartment_code }
    });
    if (existing) throw new Error(`Mã căn hộ '${data.apartment_code}' đã tồn tại`);
  }

  return prisma.apartments.update({
    where: { id: parseInt(id) },
    data: {
      floor_id: data.floor_id ? parseInt(data.floor_id) : undefined,
      apartment_code: data.apartment_code,
      room_type: data.room_type,
      area_sqm: data.area_sqm,
      max_occupants: data.max_occupants ? parseInt(data.max_occupants) : undefined,
      base_price: data.base_price,
      deposit_amount: data.deposit_amount,
      description: data.description,
      status: data.status
    }
  });
};

export const updateApartmentStatus = async (id, newStatus, reason, userId) => {
  const aptId = parseInt(id);
  const apartment = await prisma.apartments.findUnique({
    where: { id: aptId }
  });
  if (!apartment) throw new Error('Không tìm thấy căn hộ');

  const current = apartment.status;

  const validTransitions = {
    AVAILABLE:   ['OCCUPIED', 'RESERVED', 'MAINTENANCE'],
    OCCUPIED:    ['AVAILABLE'],
    MAINTENANCE: ['AVAILABLE'],
    RESERVED:    ['AVAILABLE', 'OCCUPIED'],
  };

  if (!validTransitions[current] || !validTransitions[current].includes(newStatus)) {
    throw new Error(`Không thể chuyển từ trạng thái ${current} sang ${newStatus}`);
  }

  const [updatedApartment] = await prisma.$transaction([
    prisma.apartments.update({
      where: { id: aptId },
      data: { status: newStatus }
    }),
    prisma.apartmentStatusLogs.create({
      data: {
        apartment_id: aptId,
        old_status: current,
        new_status: newStatus,
        changed_by: parseInt(userId),
        reason: reason || 'Cập nhật trạng thái thủ công'
      }
    })
  ]);

  return updatedApartment;
};

export const getApartmentStatusLogs = async (id) => {
  return prisma.apartmentStatusLogs.findMany({
    where: { apartment_id: parseInt(id) },
    orderBy: { changed_at: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          full_name: true,
          email: true,
          role: true
        }
      }
    }
  });
};

export const getFurnitureByApartment = async (apartmentId) => {
  return prisma.apartmentFurniture.findMany({
    where: { apartment_id: parseInt(apartmentId) },
    orderBy: { id: 'desc' }
  });
};

export const addFurniture = async (apartmentId, data) => {
  return prisma.apartmentFurniture.create({
    data: {
      apartment_id: parseInt(apartmentId),
      item_name: data.item_name,
      quantity: parseInt(data.quantity),
      condition: data.condition || 'NEW',
      note: data.note
    }
  });
};

export const updateFurniture = async (id, data) => {
  return prisma.apartmentFurniture.update({
    where: { id: parseInt(id) },
    data: {
      item_name: data.item_name,
      quantity: data.quantity ? parseInt(data.quantity) : undefined,
      condition: data.condition,
      note: data.note
    }
  });
};

export const deleteFurniture = async (id) => {
  return prisma.apartmentFurniture.delete({
    where: { id: parseInt(id) }
  });
};
