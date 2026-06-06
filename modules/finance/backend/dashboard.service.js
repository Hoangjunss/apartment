import { prisma } from '@my/prisma';

/**
 * Helper build scope query filter based on allowedBuildingIds.
 */
const buildScope = (allowedBuildingIds, resourceType, baseWhere = {}) => {
  if (allowedBuildingIds === 'ALL') return baseWhere;

  const allowedIds = allowedBuildingIds.length > 0 ? allowedBuildingIds.map(Number) : [-1];

  switch (resourceType) {
    case 'Building':
      return { ...baseWhere, id: { in: allowedIds } };
    case 'BuildingExpense':
      return { ...baseWhere, building_id: { in: allowedIds } };
    case 'Apartment':
      return {
        ...baseWhere,
        floor: {
          building_id: { in: allowedIds }
        }
      };
    case 'Contract':
    case 'Invoice':
    case 'ServiceRequest':
    case 'UtilityReading':
      return {
        ...baseWhere,
        apartment: {
          floor: {
            building_id: { in: allowedIds }
          }
        }
      };
    case 'Warehouse':
    case 'Asset':
      return { ...baseWhere, building_id: { in: allowedIds } };
    case 'InventoryItem':
      return {
        ...baseWhere,
        warehouse: {
          building_id: { in: allowedIds }
        }
      };
    default:
      return baseWhere;
  }
};

export const getDashboardStats = async (role, userId, allowedBuildingIds) => {
  // ── TECHNICIAN: chỉ cần task được giao ──────────────────────────────────────
  if (role === 'TECHNICIAN') {
    const [pending, inProgress] = await Promise.all([
      prisma.serviceRequests.count({ where: { assigned_to: userId, status: 'PENDING' } }),
      prisma.serviceRequests.count({ where: { assigned_to: userId, status: 'IN_PROGRESS' } }),
    ]);
    return { myPendingTasks: pending, myInProgressTasks: inProgress };
  }

  // ── RECEPTIONIST: HĐ sắp hết hạn + hóa đơn chưa thanh toán ─────────────────
  if (role === 'RECEPTIONIST') {
    const today = new Date();
    const next30Days = new Date();
    next30Days.setDate(today.getDate() + 30);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    const contractScope = buildScope(allowedBuildingIds, 'Contract', {
      status: { in: ['ACTIVE', 'EXPIRING_SOON'] },
      end_date: { lte: next30Days, gte: today }
    });

    const invoiceScope = buildScope(allowedBuildingIds, 'Invoice', {
      status: { in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] }
    });

    const paymentScope = allowedBuildingIds === 'ALL'
      ? { payment_date: { gte: startOfMonth, lte: endOfMonth } }
      : {
          payment_date: { gte: startOfMonth, lte: endOfMonth },
          invoice: buildScope(allowedBuildingIds, 'Invoice')
        };

    const expenseScope = buildScope(allowedBuildingIds, 'BuildingExpense', {
      status: 'PAID',
      deleted_at: null,
      expense_date: { gte: startOfMonth, lte: endOfMonth }
    });

    const [expiringContracts, unpaidInvoicesRaw, paymentsAgg, expensesAgg] = await Promise.all([
      prisma.contracts.count({ where: contractScope }),
      prisma.invoices.findMany({
        where: invoiceScope,
        include: { payments: true }
      }),
      prisma.payments.aggregate({
        _sum: { amount: true },
        where: paymentScope
      }),
      prisma.buildingExpenses.aggregate({
        _sum: { amount: true },
        where: expenseScope
      })
    ]);

    let unpaidAmount = 0;
    let unpaidCount = 0;
    for (const inv of unpaidInvoicesRaw) {
      const totalPaid = inv.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const remaining = Number(inv.total_amount) - totalPaid;
      if (remaining > 0) { unpaidAmount += remaining; unpaidCount++; }
    }

    const revenueThisMonth = Number(paymentsAgg._sum.amount || 0);
    const expensesThisMonth = Number(expensesAgg._sum.amount || 0);
    const grossProfit = revenueThisMonth - expensesThisMonth;

    return {
      expiringContracts,
      unpaidAmount,
      unpaidCount,
      revenueThisMonth,
      expensesThisMonth,
      grossProfit
    };
  }

  // ── ADMIN / MANAGER: full stats ──────────────────────────────────────────────
  const apartmentScope = buildScope(allowedBuildingIds, 'Apartment');
  const availableApartmentScope = buildScope(allowedBuildingIds, 'Apartment', { status: 'AVAILABLE' });
  const occupiedApartmentScope = buildScope(allowedBuildingIds, 'Apartment', { status: 'OCCUPIED' });
  const activeContractScope = buildScope(allowedBuildingIds, 'Contract', { status: 'ACTIVE' });
  const buildingScope = buildScope(allowedBuildingIds, 'Building', { deleted_at: null });
  const warehouseScope = buildScope(allowedBuildingIds, 'Warehouse');
  const inventoryItemScope = buildScope(allowedBuildingIds, 'InventoryItem');

  const pendingServiceScope = buildScope(allowedBuildingIds, 'ServiceRequest', { status: 'PENDING' });
  const progressServiceScope = buildScope(allowedBuildingIds, 'ServiceRequest', { status: 'IN_PROGRESS' });

  const expenseListScope = buildScope(allowedBuildingIds, 'BuildingExpense', { deleted_at: null });
  const serviceListScope = buildScope(allowedBuildingIds, 'ServiceRequest');

  const [
    totalApartments,
    emptyApartments,
    rentingApartments,
    activeContractsCount,
    activeContracts,
    totalBuildings,
    totalWarehouses,
    totalInventoryItems,
    allInventoryItems,
    serviceRequestsPending,
    serviceRequestsInProgress,
    recentExpenses,
    recentServiceRequests
  ] = await Promise.all([
    prisma.apartments.count({ where: apartmentScope }),
    prisma.apartments.count({ where: availableApartmentScope }),
    prisma.apartments.count({ where: occupiedApartmentScope }),
    prisma.contracts.count({ where: activeContractScope }),
    prisma.contracts.findMany({
      where: activeContractScope,
      select: { id: true, tenant_id: true, end_date: true }
    }),
    prisma.buildings.count({ where: buildingScope }),
    prisma.warehouses.count({ where: warehouseScope }),
    prisma.inventoryItems.count({ where: inventoryItemScope }),
    prisma.inventoryItems.findMany({
      where: inventoryItemScope,
      select: { id: true, current_stock: true, min_stock_level: true }
    }),
    prisma.serviceRequests.count({ where: pendingServiceScope }),
    prisma.serviceRequests.count({ where: progressServiceScope }),
    prisma.buildingExpenses.findMany({
      where: expenseListScope,
      orderBy: { expense_date: 'desc' },
      take: 5,
      include: { building: { select: { name: true, code: true } } }
    }),
    prisma.serviceRequests.findMany({
      where: serviceListScope,
      orderBy: { created_at: 'desc' },
      take: 5,
      include: { apartment: { select: { apartment_code: true } } }
    })
  ]);

  const tenantIds = new Set(activeContracts.map(c => c.tenant_id));
  const activeTenants = tenantIds.size;

  const today = new Date();

  const expiringContractsScope = buildScope(allowedBuildingIds, 'Contract', { status: 'EXPIRING_SOON' });
  const expiringContracts = await prisma.contracts.count({
    where: expiringContractsScope
  });

  const lowStockCount = allInventoryItems.filter(item => item.current_stock <= item.min_stock_level).length;

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

  const paymentScope = allowedBuildingIds === 'ALL'
    ? { payment_date: { gte: startOfMonth, lte: endOfMonth } }
    : {
        payment_date: { gte: startOfMonth, lte: endOfMonth },
        invoice: buildScope(allowedBuildingIds, 'Invoice')
      };

  const expenseMonthlyScope = buildScope(allowedBuildingIds, 'BuildingExpense', {
    status: 'PAID',
    deleted_at: null,
    expense_date: { gte: startOfMonth, lte: endOfMonth }
  });

  const [paymentsAgg, expensesAgg] = await Promise.all([
    prisma.payments.aggregate({
      _sum: { amount: true },
      where: paymentScope
    }),
    prisma.buildingExpenses.aggregate({
      _sum: { amount: true },
      where: expenseMonthlyScope
    })
  ]);
  const revenueThisMonth = Number(paymentsAgg._sum.amount || 0);
  const expensesThisMonth = Number(expensesAgg._sum.amount || 0);
  const grossProfit = revenueThisMonth - expensesThisMonth;

  const unpaidInvoiceScope = buildScope(allowedBuildingIds, 'Invoice', {
    status: { in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] }
  });

  const unpaidInvoices = await prisma.invoices.findMany({
    where: unpaidInvoiceScope,
    include: { payments: true }
  });

  let unpaidAmount = 0;
  let unpaidCount = 0;
  for (const inv of unpaidInvoices) {
    const totalPaid = inv.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = Number(inv.total_amount) - totalPaid;
    if (remaining > 0) { unpaidAmount += remaining; unpaidCount++; }
  }

  const occupancyRate = totalApartments > 0 ? Math.round((rentingApartments / totalApartments) * 100) : 0;

  return {
    emptyApartments,
    rentingApartments,
    totalApartments,
    totalBuildings,
    activeContracts: activeContractsCount,
    activeTenants,
    expiringContracts,
    revenueThisMonth,
    expensesThisMonth,
    grossProfit,
    unpaidAmount,
    unpaidCount,
    occupancyRate,
    totalWarehouses,
    totalInventoryItems,
    lowStockCount,
    serviceRequestsPending,
    serviceRequestsInProgress,
    recentExpenses,
    recentServiceRequests
  };
};

export const getRevenueHistory = async (monthsCount = 6, allowedBuildingIds) => {
  const result = [];
  const today = new Date();

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = d.getFullYear();
    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
    const billing_month = `${year}-${monthStr}`;

    const startOfMonth = new Date(year, d.getMonth(), 1);
    const endOfMonth = new Date(year, d.getMonth() + 1, 0, 23, 59, 59, 999);

    const invoiceScope = buildScope(allowedBuildingIds, 'Invoice', { billing_month });
    const expenseScope = buildScope(allowedBuildingIds, 'BuildingExpense', {
      status: 'PAID',
      deleted_at: null,
      expense_date: { gte: startOfMonth, lte: endOfMonth }
    });

    const [invoicesInMonth, expensesAgg] = await Promise.all([
      prisma.invoices.findMany({
        where: invoiceScope,
        include: { payments: true }
      }),
      prisma.buildingExpenses.aggregate({
        _sum: { amount: true },
        where: expenseScope
      })
    ]);

    let collected = 0;
    let uncollected = 0;

    for (const inv of invoicesInMonth) {
      const paid = inv.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      collected += paid;
      uncollected += Math.max(0, Number(inv.total_amount) - paid);
    }

    const expenses = Number(expensesAgg._sum.amount || 0);

    result.push({
      month: billing_month,
      collected,
      uncollected,
      expenses
    });
  }

  return result;
};

export const getApartmentTypes = async (allowedBuildingIds) => {
  const apartmentScope = buildScope(allowedBuildingIds, 'Apartment');
  const groups = await prisma.apartments.groupBy({
    by: ['room_type'],
    where: apartmentScope,
    _count: { id: true }
  });

  return groups.map(g => ({
    type: g.room_type,
    count: g._count.id
  }));
};

export const getUnpaidInvoices = async (allowedBuildingIds) => {
  const unpaidInvoiceScope = buildScope(allowedBuildingIds, 'Invoice', {
    status: { in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] }
  });

  const unpaidInvoices = await prisma.invoices.findMany({
    where: unpaidInvoiceScope,
    orderBy: { due_date: 'asc' },
    take: 5,
    include: {
      contract: {
        include: {
          tenant: { select: { id: true, full_name: true } }
        }
      },
      apartment: { select: { id: true, apartment_code: true } }
    }
  });

  const result = [];
  for (const inv of unpaidInvoices) {
    const payments = await prisma.payments.findMany({ where: { invoice_id: inv.id } });
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = Math.max(0, Number(inv.total_amount) - totalPaid);
    result.push({
      ...inv,
      remaining_amount: remaining
    });
  }
  return result;
};

export const getRecentActivities = async (allowedBuildingIds) => {
  const contractScope = buildScope(allowedBuildingIds, 'Contract');
  const readingScope = buildScope(allowedBuildingIds, 'UtilityReading');
  const invoiceScope = buildScope(allowedBuildingIds, 'Invoice');
  const apartmentScope = buildScope(allowedBuildingIds, 'Apartment');

  const [contracts, readings, invoices, apartments] = await Promise.all([
    prisma.contracts.findMany({
      where: contractScope,
      take: 8,
      orderBy: { created_at: 'desc' },
      include: { tenant: { select: { full_name: true } }, apartment: { select: { apartment_code: true } } }
    }),
    prisma.utilityReadings.findMany({
      where: readingScope,
      take: 8,
      orderBy: { recorded_at: 'desc' },
      include: { apartment: { select: { apartment_code: true } } }
    }),
    prisma.invoices.findMany({
      where: invoiceScope,
      take: 8,
      orderBy: { created_at: 'desc' },
      include: { apartment: { select: { apartment_code: true } }, contract: { include: { tenant: { select: { full_name: true } } } } }
    }),
    prisma.apartments.findMany({
      where: apartmentScope,
      take: 8,
      orderBy: { created_at: 'desc' },
      include: { floor: { include: { building: { select: { name: true } } } } }
    })
  ]);

  const activities = [];

  for (const c of contracts) {
    activities.push({
      type: 'CONTRACT',
      title: 'Tạo hợp đồng mới',
      detail: `${c.contract_code} — Căn ${c.apartment?.apartment_code || '—'} — ${c.tenant?.full_name || '—'}`,
      time: c.created_at
    });
  }

  for (const r of readings) {
    activities.push({
      type: 'UTILITY',
      title: 'Ghi chỉ số điện/nước',
      detail: `Căn ${r.apartment?.apartment_code || '—'} — Tháng ${r.billing_month}`,
      time: r.recorded_at
    });
  }

  for (const inv of invoices) {
    activities.push({
      type: 'INVOICE',
      title: inv.status === 'PAID' ? 'Thanh toán hóa đơn' : 'Tạo hóa đơn mới',
      detail: `${inv.invoice_code} — ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(inv.total_amount))}`,
      time: inv.created_at
    });
  }

  for (const a of apartments) {
    activities.push({
      type: 'APARTMENT',
      title: 'Tạo căn hộ mới',
      detail: `${a.apartment_code} — ${a.floor?.building?.name || ''} Tầng ${a.floor?.floor_number || ''}`,
      time: a.created_at
    });
  }

  activities.sort((a, b) => new Date(b.time) - new Date(a.time));
  return activities.slice(0, 8);
};

