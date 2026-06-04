import { prisma } from '@my/prisma';

export const getEvents = async ({ start, end }) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  endDate.setHours(23, 59, 59, 999);

  const [expiringContracts, unpaidInvoices, maintenanceRequests] = await Promise.all([
    // 1. Hợp đồng sắp hết hạn
    prisma.contracts.findMany({
      where: {
        end_date: {
          gte: startDate,
          lte: endDate,
        },
        status: { in: ['ACTIVE', 'EXPIRING_SOON'] },
      },
      include: {
        tenant: { select: { full_name: true } },
        apartment: { select: { apartment_code: true } },
      },
    }),

    // 2. Hóa đơn chưa thanh toán đến hạn đóng tiền
    prisma.invoices.findMany({
      where: {
        due_date: {
          gte: startDate,
          lte: endDate,
        },
        status: { in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] },
      },
      include: {
        contract: {
          include: {
            tenant: { select: { full_name: true } },
          },
        },
        apartment: { select: { apartment_code: true } },
        payments: true,
      },
    }),

    // 3. Yêu cầu kỹ thuật/sửa chữa dự kiến
    prisma.serviceRequests.findMany({
      where: {
        scheduled_start_date: {
          gte: startDate,
          lte: endDate,
        },
        type: 'MAINTENANCE',
        status: { not: 'CANCELLED' } // Không hiển thị yêu cầu đã bị hủy
      },
      include: {
        apartment: { select: { apartment_code: true } }
      }
    })
  ]);

  const events = [];

  // Map hợp đồng hết hạn
  for (const c of expiringContracts) {
    events.push({
      id: `contract-expiry-${c.id}`,
      type: 'CONTRACT_EXPIRY',
      title: `Hết hạn HĐ: Căn ${c.apartment?.apartment_code || '—'} (${c.tenant?.full_name || '—'})`,
      start: c.end_date.toISOString().split('T')[0],
      end: c.end_date.toISOString().split('T')[0],
      color: 'orange',
      referenceId: c.id,
    });
  }

  // Map hóa đơn đến hạn
  for (const inv of unpaidInvoices) {
    const totalPaid = inv.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = Math.max(0, Number(inv.total_amount) - totalPaid);
    if (remaining > 0) {
      events.push({
        id: `invoice-due-${inv.id}`,
        type: 'PAYMENT_DUE',
        title: `Hạn nộp tiền: Căn ${inv.apartment?.apartment_code || '—'} - ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(remaining)}`,
        start: inv.due_date.toISOString().split('T')[0],
        end: inv.due_date.toISOString().split('T')[0],
        color: 'red',
        referenceId: inv.id,
      });
    }
  }

  // Map yêu cầu bảo trì sửa chữa
  for (const r of maintenanceRequests) {
    if (r.scheduled_start_date) {
      events.push({
        id: `maintenance-${r.id}`,
        type: 'MAINTENANCE',
        title: `Sửa chữa: Căn ${r.apartment?.apartment_code || '—'} - ${r.title}`,
        start: r.scheduled_start_date.toISOString().split('T')[0],
        end: r.scheduled_start_date.toISOString().split('T')[0],
        color: 'blue',
        referenceId: r.id
      });
    }
  }

  return events;
};
