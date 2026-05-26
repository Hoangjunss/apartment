import { prisma } from '@my/prisma';

// ==========================================
// TENANTS
// ==========================================

export const getTenants = async ({ page = 1, limit = 20, search, status }) => {
  const where = {
    AND: [
      search
        ? {
            OR: [
              { full_name: { contains: search } },
              { national_id: { contains: search } },
              { phone: { contains: search } },
            ],
          }
        : {},
      status === 'ACTIVE'
        ? {
            contracts: { some: { status: 'ACTIVE' } },
          }
        : {},
      status === 'EXPIRED'
        ? {
            // "every" ở đây có thể gây nhầm lẫn nếu tenant không có hợp đồng nào.
            // Để chắc chắn, nên filter tenant có ít nhất 1 hợp đồng, và TẤT CẢ hợp đồng đều không phải là ACTIVE
            contracts: {
              some: {}, // Có ít nhất 1 hợp đồng
              every: { status: { in: ['EXPIRED', 'TERMINATED'] } },
            },
          }
        : {},
    ],
  };

  const [items, total] = await Promise.all([
    prisma.tenants.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        contracts: {
          orderBy: { start_date: 'desc' },
          take: 1, // Lấy hợp đồng mới nhất
          include: {
            apartment: { select: { apartment_code: true } },
          },
        },
      },
    }),
    prisma.tenants.count({ where }),
  ]);

  // Flatten response
  const mappedItems = items.map((t) => {
    const latestContract = t.contracts[0];
    const { contracts, ...rest } = t;
    return {
      ...rest,
      current_room: latestContract?.apartment?.apartment_code || null,
      contract_status: latestContract?.status || null,
      contract_start: latestContract?.start_date || null,
    };
  });

  return { items: mappedItems, total, page, limit };
};

export const getTenantById = async (id) => {
  return prisma.tenants.findUnique({
    where: { id },
    include: {
      contracts: {
        include: { apartment: true },
        orderBy: { start_date: 'desc' },
      },
      temporary_registrations: {
        orderBy: { created_at: 'desc' },
      },
    },
  });
};

export const getTenantHistory = async (id) => {
  const history = await prisma.contracts.findMany({
    where: { tenant_id: id },
    include: {
      apartment: {
        include: {
          floor: {
            include: { building: true },
          },
        },
      },
    },
    orderBy: { start_date: 'desc' },
  });

  return history.map((h) => ({
    id: h.id,
    contract_code: h.contract_code,
    apartment_code: h.apartment.apartment_code,
    apartment: {
      id: h.apartment_id,
      apartment_code: h.apartment.apartment_code,
    },
    building_name: h.apartment.floor.building.name,
    start_date: h.start_date,
    end_date: h.end_date,
    monthly_rent: h.monthly_rent,
    status: h.status,
  }));
};

export const createTenant = async (data) => {
  const existing = await prisma.tenants.findUnique({
    where: { national_id: data.national_id },
  });
  if (existing) {
    throw new Error(`CCCD '${data.national_id}' đã tồn tại trong hệ thống (ID: ${existing.id})`);
  }

  // Parse date strings to Date objects if necessary
  if (data.national_id_issued_date) data.national_id_issued_date = new Date(data.national_id_issued_date);
  if (data.date_of_birth) data.date_of_birth = new Date(data.date_of_birth);

  return prisma.tenants.create({ data });
};

export const updateTenant = async (id, data) => {
  if (data.national_id) {
    const existing = await prisma.tenants.findUnique({
      where: { national_id: data.national_id },
    });
    if (existing && existing.id !== id) {
      throw new Error(`CCCD '${data.national_id}' đã tồn tại trong hệ thống (ID: ${existing.id})`);
    }
  }

  if (data.national_id_issued_date) data.national_id_issued_date = new Date(data.national_id_issued_date);
  if (data.date_of_birth) data.date_of_birth = new Date(data.date_of_birth);

  return prisma.tenants.update({
    where: { id },
    data,
  });
};

// ==========================================
// TEMPORARY REGISTRATIONS
// ==========================================

export const getRegistrationsByTenant = async (tenantId) => {
  return prisma.temporaryRegistrations.findMany({
    where: { tenant_id: tenantId },
    orderBy: { created_at: 'desc' },
    include: {
      apartment: { select: { apartment_code: true } },
      submitter: { select: { full_name: true } },
    },
  });
};

export const createRegistration = async (tenantId, data, submittedBy) => {
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);

  if (endDate < startDate) {
    throw new Error('Ngày kết thúc không được nhỏ hơn ngày bắt đầu');
  }

  // Tìm hợp đồng đang ACTIVE để lấy apartment_id
  const activeContract = await prisma.contracts.findFirst({
    where: { tenant_id: tenantId, status: 'ACTIVE' },
  });

  if (!activeContract) {
    throw new Error('Khách thuê không có hợp đồng đang hiệu lực, không thể đăng ký');
  }

  return prisma.temporaryRegistrations.create({
    data: {
      tenant_id: tenantId,
      apartment_id: activeContract.apartment_id,
      type: data.type,
      start_date: startDate,
      end_date: endDate,
      destination: data.destination,
      reason: data.reason,
      submitted_by: submittedBy,
    },
  });
};

export const getAllRegistrations = async ({ page = 1, limit = 20, month, year }) => {
  const where = {};
  
  if (month && year) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    where.created_at = {
      gte: startDate,
      lte: endDate,
    };
  }

  const [items, total] = await Promise.all([
    prisma.temporaryRegistrations.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        tenant: { select: { full_name: true, national_id: true } },
        apartment: { select: { apartment_code: true } },
        submitter: { select: { full_name: true } },
      },
    }),
    prisma.temporaryRegistrations.count({ where }),
  ]);

  return { items, total, page, limit };
};
