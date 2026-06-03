import { prisma } from '@my/prisma';

/**
 * Thực hiện tìm kiếm toàn cầu cho các thực thể: Tenant, Apartment, Building, Contract, Invoice.
 *
 * @param {string} query - Chuỗi tìm kiếm nhập từ người dùng.
 */
export const globalSearch = async (query) => {
  const q = String(query).trim();
  if (!q || q.length < 2) {
    return {
      tenants: [],
      apartments: [],
      buildings: [],
      contracts: [],
      invoices: [],
    };
  }

  const [tenants, apartments, buildings, contracts, invoices] = await Promise.all([
    // Tìm kiếm Khách thuê
    prisma.tenants.findMany({
      where: {
        OR: [
          { full_name: { contains: q } },
          { phone: { contains: q } },
          { national_id: { contains: q } },
          { email: { contains: q } },
        ],
        deleted_at: null,
      },
      take: 5,
      select: {
        id: true,
        full_name: true,
        national_id: true,
        phone: true,
      },
    }),

    // Tìm kiếm Căn hộ
    prisma.apartments.findMany({
      where: {
        apartment_code: { contains: q },
        deleted_at: null,
      },
      take: 5,
      select: {
        id: true,
        apartment_code: true,
        floor: {
          select: {
            building: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),

    // Tìm kiếm Tòa nhà
    prisma.buildings.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { code: { contains: q } },
        ],
        deleted_at: null,
      },
      take: 5,
      select: {
        id: true,
        name: true,
        code: true,
      },
    }),

    // Tìm kiếm Hợp đồng
    prisma.contracts.findMany({
      where: {
        contract_code: { contains: q },
        deleted_at: null,
      },
      take: 5,
      select: {
        id: true,
        contract_code: true,
        tenant: {
          select: {
            full_name: true,
          },
        },
      },
    }),

    // Tìm kiếm Hóa đơn
    prisma.invoices.findMany({
      where: {
        invoice_code: { contains: q },
        deleted_at: null,
      },
      take: 5,
      select: {
        id: true,
        invoice_code: true,
        billing_month: true,
      },
    }),
  ]);

  return {
    tenants,
    apartments,
    buildings,
    contracts,
    invoices,
  };
};
