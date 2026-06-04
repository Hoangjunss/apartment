import { prisma } from '@my/prisma';

export const getDashboardStats = async (role, userId) => {
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

    const [expiringContracts, unpaidInvoicesRaw, paymentsAgg, expensesAgg] = await Promise.all([
      prisma.contracts.count({
        where: {
          status: { in: ['ACTIVE', 'EXPIRING_SOON'] },
          end_date: { lte: next30Days, gte: today }
        }
      }),
      prisma.invoices.findMany({
        where: { status: { in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] } },
        include: { payments: true }
      }),
      prisma.payments.aggregate({
        _sum: { amount: true },
        where: { payment_date: { gte: startOfMonth, lte: endOfMonth } }
      }),
      prisma.buildingExpenses.aggregate({
        _sum: { amount: true },
        where: {
          status: 'PAID',
          deleted_at: null,
          expense_date: { gte: startOfMonth, lte: endOfMonth }
        }
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
    prisma.apartments.count(),
    prisma.apartments.count({ where: { status: 'AVAILABLE' } }),
    prisma.apartments.count({ where: { status: 'OCCUPIED' } }),
    prisma.contracts.count({ where: { status: 'ACTIVE' } }),
    prisma.contracts.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, tenant_id: true, end_date: true }
    }),
    prisma.buildings.count({ where: { deleted_at: null } }),
    prisma.warehouses.count(),
    prisma.inventoryItems.count(),
    prisma.inventoryItems.findMany({ select: { id: true, current_stock: true, min_stock_level: true } }),
    prisma.serviceRequests.count({ where: { status: 'PENDING' } }),
    prisma.serviceRequests.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.buildingExpenses.findMany({
      where: { deleted_at: null },
      orderBy: { expense_date: 'desc' },
      take: 5,
      include: { building: { select: { name: true, code: true } } }
    }),
    prisma.serviceRequests.findMany({
      orderBy: { created_at: 'desc' },
      take: 5,
      include: { apartment: { select: { apartment_code: true } } }
    })
  ]);

  const tenantIds = new Set(activeContracts.map(c => c.tenant_id));
  const activeTenants = tenantIds.size;

  const today = new Date();

  // Đếm số hợp đồng đã được cron chuyển sang EXPIRING_SOON
  // (khớp với dữ liệu hiển thị ở trang Hợp đồng khi filter EXPIRING_SOON)
  const expiringContracts = await prisma.contracts.count({
    where: { status: 'EXPIRING_SOON' }
  });

  const lowStockCount = allInventoryItems.filter(item => item.current_stock <= item.min_stock_level).length;

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
  const [paymentsAgg, expensesAgg] = await Promise.all([
    prisma.payments.aggregate({
      _sum: { amount: true },
      where: { payment_date: { gte: startOfMonth, lte: endOfMonth } }
    }),
    prisma.buildingExpenses.aggregate({
      _sum: { amount: true },
      where: {
        status: 'PAID',
        deleted_at: null,
        expense_date: { gte: startOfMonth, lte: endOfMonth }
      }
    })
  ]);
  const revenueThisMonth = Number(paymentsAgg._sum.amount || 0);
  const expensesThisMonth = Number(expensesAgg._sum.amount || 0);
  const grossProfit = revenueThisMonth - expensesThisMonth;

  const unpaidInvoices = await prisma.invoices.findMany({
    where: { status: { in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] } },
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

export const getRevenueHistory = async (monthsCount = 6) => {
  const result = [];
  const today = new Date();

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = d.getFullYear();
    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
    const billing_month = `${year}-${monthStr}`;

    const startOfMonth = new Date(year, d.getMonth(), 1);
    const endOfMonth = new Date(year, d.getMonth() + 1, 0, 23, 59, 59, 999);

    const [invoicesInMonth, expensesAgg] = await Promise.all([
      prisma.invoices.findMany({
        where: { billing_month },
        include: { payments: true }
      }),
      prisma.buildingExpenses.aggregate({
        _sum: { amount: true },
        where: {
          status: 'PAID',
          deleted_at: null,
          expense_date: { gte: startOfMonth, lte: endOfMonth }
        }
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

export const getApartmentTypes = async () => {
  const groups = await prisma.apartments.groupBy({
    by: ['room_type'],
    _count: { id: true }
  });

  return groups.map(g => ({
    type: g.room_type,
    count: g._count.id
  }));
};

export const getUnpaidInvoices = async () => {
  const unpaidInvoices = await prisma.invoices.findMany({
    where: {
      status: { in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] }
    },
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

export const getRecentActivities = async () => {
  const [contracts, readings, invoices, apartments] = await Promise.all([
    prisma.contracts.findMany({
      take: 8,
      orderBy: { created_at: 'desc' },
      include: { tenant: { select: { full_name: true } }, apartment: { select: { apartment_code: true } } }
    }),
    prisma.utilityReadings.findMany({
      take: 8,
      orderBy: { recorded_at: 'desc' },
      include: { apartment: { select: { apartment_code: true } } }
    }),
    prisma.invoices.findMany({
      take: 8,
      orderBy: { created_at: 'desc' },
      include: { apartment: { select: { apartment_code: true } }, contract: { include: { tenant: { select: { full_name: true } } } } }
    }),
    prisma.apartments.findMany({
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
