import { prisma } from '@my/prisma';

export const getTenants = async ({ search, status, page = 1, limit = 20 }) => {
  const p = parseInt(page);
  const l = parseInt(limit);

  // Xây dựng điều kiện filter
  const conditions = [];

  if (search) {
    conditions.push({
      OR: [
        { full_name: { contains: search } },
        { national_id: { contains: search } },
        { phone: { contains: search } }
      ]
    });
  }

  if (status === 'ACTIVE') {
    conditions.push({
      contracts: {
        some: { status: 'ACTIVE' }
      }
    });
  } else if (status === 'EXPIRED') {
    conditions.push({
      contracts: {
        every: { status: { in: ['EXPIRED', 'TERMINATED'] } }
      },
      // Đảm bảo phải có ít nhất 1 hợp đồng để tính là đã từng thuê và hết hạn
      NOT: {
        contracts: { none: {} }
      }
    });
  }

  const where = conditions.length > 0 ? { AND: conditions } : {};

  const [tenants, total] = await Promise.all([
    prisma.tenants.findMany({
      where,
      skip: (p - 1) * l,
      take: l,
      orderBy: { id: 'desc' },
      include: {
        contracts: {
          orderBy: { start_date: 'desc' },
          include: {
            apartment: true
          }
        }
      }
    }),
    prisma.tenants.count({ where })
  ]);

  // Flat-map response để trả về current_room và contract_status
  const items = tenants.map(tenant => {
    // Tìm hợp đồng active trước, nếu không có thì lấy hợp đồng mới nhất
    const activeContract = tenant.contracts.find(c => c.status === 'ACTIVE') || tenant.contracts[0];
    
    return {
      id: tenant.id,
      full_name: tenant.full_name,
      national_id: tenant.national_id,
      national_id_issued_date: tenant.national_id_issued_date,
      national_id_issued_place: tenant.national_id_issued_place,
      date_of_birth: tenant.date_of_birth,
      gender: tenant.gender,
      phone: tenant.phone,
      email: tenant.email,
      permanent_address: tenant.permanent_address,
      nationality: tenant.nationality,
      occupation: tenant.occupation,
      avatar_url: tenant.avatar_url,
      created_at: tenant.created_at,
      updated_at: tenant.updated_at,
      current_room: activeContract?.apartment?.apartment_code || null,
      contract_status: activeContract?.status || 'NONE',
      contract_start: activeContract?.start_date || null
    };
  });

  return { items, total, page: p, limit: l };
};

export const getTenantById = async (id) => {
  const tenant = await prisma.tenants.findUnique({
    where: { id: parseInt(id) },
    include: {
      contracts: {
        orderBy: { start_date: 'desc' },
        include: {
          apartment: {
            include: {
              floor: {
                include: { building: true }
              }
            }
          }
        }
      }
    }
  });

  if (!tenant) throw new Error('Không tìm thấy khách thuê');

  // Tìm hợp đồng active hoặc mới nhất để trả kèm thông tin tóm tắt
  const activeContract = tenant.contracts.find(c => c.status === 'ACTIVE') || tenant.contracts[0];

  return {
    ...tenant,
    current_room: activeContract?.apartment?.apartment_code || null,
    contract_status: activeContract?.status || 'NONE',
    contract_start: activeContract?.start_date || null
  };
};

export const createTenant = async (data) => {
  // Validate national_id unique
  const existing = await prisma.tenants.findUnique({
    where: { national_id: data.national_id }
  });
  if (existing) {
    const err = new Error(`Số CCCD '${data.national_id}' đã tồn tại trong hệ thống`);
    err.status = 409;
    err.existingId = existing.id;
    throw err;
  }

  return prisma.tenants.create({
    data: {
      full_name: data.full_name,
      national_id: data.national_id,
      national_id_issued_date: new Date(data.national_id_issued_date),
      national_id_issued_place: data.national_id_issued_place,
      date_of_birth: new Date(data.date_of_birth),
      gender: data.gender,
      phone: data.phone,
      email: data.email,
      permanent_address: data.permanent_address,
      nationality: data.nationality || 'Việt Nam',
      occupation: data.occupation,
      avatar_url: data.avatar_url
    }
  });
};

export const updateTenant = async (id, data) => {
  const tId = parseInt(id);
  const tenant = await prisma.tenants.findUnique({
    where: { id: tId }
  });
  if (!tenant) throw new Error('Không tìm thấy khách thuê');

  if (data.national_id && data.national_id !== tenant.national_id) {
    const existing = await prisma.tenants.findUnique({
      where: { national_id: data.national_id }
    });
    if (existing) {
      const err = new Error(`Số CCCD '${data.national_id}' đã tồn tại trong hệ thống`);
      err.status = 409;
      err.existingId = existing.id;
      throw err;
    }
  }

  return prisma.tenants.update({
    where: { id: tId },
    data: {
      full_name: data.full_name,
      national_id: data.national_id,
      national_id_issued_date: data.national_id_issued_date ? new Date(data.national_id_issued_date) : undefined,
      national_id_issued_place: data.national_id_issued_place,
      date_of_birth: data.date_of_birth ? new Date(data.date_of_birth) : undefined,
      gender: data.gender,
      phone: data.phone,
      email: data.email,
      permanent_address: data.permanent_address,
      nationality: data.nationality,
      occupation: data.occupation,
      avatar_url: data.avatar_url
    }
  });
};

export const getTenantHistory = async (id) => {
  const contracts = await prisma.contracts.findMany({
    where: { tenant_id: parseInt(id) },
    include: {
      apartment: {
        include: {
          floor: {
            include: { building: true }
          }
        }
      }
    },
    orderBy: { start_date: 'desc' }
  });

  return contracts.map(c => ({
    id: c.id,
    contract_code: c.contract_code,
    apartment_code: c.apartment.apartment_code,
    building_name: c.apartment.floor.building.name,
    start_date: c.start_date,
    end_date: c.end_date,
    monthly_rent: c.monthly_rent,
    status: c.status
  }));
};

export const getRegistrationsByTenant = async (tenantId) => {
  return prisma.temporaryRegistrations.findMany({
    where: { tenant_id: parseInt(tenantId) },
    orderBy: { created_at: 'desc' },
    include: {
      apartment: true,
      submitter: {
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

export const createRegistration = async (tenantId, data, userId) => {
  const tId = parseInt(tenantId);
  const start = new Date(data.start_date);
  const end = new Date(data.end_date);

  if (end < start) {
    throw new Error('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu');
  }

  // Validate tenant has ACTIVE contract
  const activeContract = await prisma.contracts.findFirst({
    where: {
      tenant_id: tId,
      status: 'ACTIVE'
    }
  });

  if (!activeContract) {
    throw new Error('Khách thuê không có hợp đồng đang hiệu lực');
  }

  return prisma.temporaryRegistrations.create({
    data: {
      tenant_id: tId,
      apartment_id: activeContract.apartment_id,
      type: data.type, // TEMPORARY_RESIDENCE hoặc TEMPORARY_ABSENCE
      start_date: start,
      end_date: end,
      destination: data.destination,
      reason: data.reason,
      submitted_by: parseInt(userId)
    }
  });
};
