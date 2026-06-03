import cron from 'node-cron';
import { prisma } from '@my/prisma';
import { createNotification } from '@my/notifications-backend/service';

// Lấy tất cả ADMIN và MANAGER để gửi thông báo hệ thống
const getManagerIds = async () => {
  const users = await prisma.users.findMany({
    where: { role: { in: ['ADMIN', 'MANAGER'] }, is_active: true },
    select: { id: true },
  });
  return users.map((u) => u.id);
};

// Chạy hàng ngày lúc 00:00
cron.schedule('0 0 * * *', async () => {
  console.log('[CRON] Bắt đầu rà soát trạng thái Hợp đồng...');
  const today = new Date();
  
  // in30Days: Ngày hiện tại cộng thêm 30 ngày
  const in30Days = new Date(today);
  in30Days.setDate(today.getDate() + 30);

  try {
    // 1. ACTIVE -> EXPIRING_SOON (Chỉ còn <= 30 ngày)
    const expiringSoon = await prisma.contracts.findMany({
      where: {
        status: 'ACTIVE',
        end_date: { lte: in30Days, gte: today },
      },
      include: {
        tenant: { select: { full_name: true } },
        apartment: { select: { apartment_code: true } },
      },
    });

    if (expiringSoon.length > 0) {
      await prisma.contracts.updateMany({
        where: { id: { in: expiringSoon.map((c) => c.id) } },
        data: { status: 'EXPIRING_SOON' },
      });
      console.log(`[CRON] Đã cập nhật ${expiringSoon.length} hợp đồng sang EXPIRING_SOON.`);

      // Gửi notification tới tất cả Manager/Admin
      const managerIds = await getManagerIds();
      for (const contract of expiringSoon) {
        const daysLeft = Math.ceil((new Date(contract.end_date) - today) / (1000 * 60 * 60 * 24));
        for (const userId of managerIds) {
          await createNotification({
            userId,
            title: 'Hợp đồng sắp hết hạn',
            message: `Hợp đồng căn hộ ${contract.apartment.apartment_code} (${contract.tenant.full_name}) còn ${daysLeft} ngày.`,
            type: 'CONTRACT_EXPIRING',
            entityType: 'Contract',
            entityId: contract.id,
          });
        }
      }
    }

    // 2. -> EXPIRED (Đã qua ngày kết thúc)
    const expiredResult = await prisma.contracts.updateMany({
      where: {
        status: { in: ['ACTIVE', 'EXPIRING_SOON'] },
        end_date: { lt: today },
      },
      data: { status: 'EXPIRED' },
    });
    console.log(`[CRON] Đã cập nhật ${expiredResult.count} hợp đồng sang EXPIRED.`);

    // 3. Set apartment AVAILABLE cho các contract vừa EXPIRED
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 2);

    const expiredContracts = await prisma.contracts.findMany({
      where: { 
        status: 'EXPIRED', 
        end_date: { gte: yesterday, lt: today } 
      }
    });

    let freeApartmentCount = 0;
    for (const c of expiredContracts) {
      await prisma.apartments.update({
        where: { id: c.apartment_id },
        data: { status: 'AVAILABLE' },
      });
      freeApartmentCount++;
      
      await prisma.apartmentStatusLogs.create({
        data: {
          apartment_id: c.apartment_id,
          old_status: 'OCCUPIED',
          new_status: 'AVAILABLE',
          changed_by: 1,
          reason: `Trả phòng tự động do Hợp đồng ${c.contract_code} hết hạn`,
        }
      });
    }
    console.log(`[CRON] Đã giải phóng ${freeApartmentCount} căn hộ về AVAILABLE.`);

    // 4. Rà soát hóa đơn quá hạn -> OVERDUE + gửi notification
    const overdueInvoices = await prisma.invoices.findMany({
      where: {
        status: { in: ['UNPAID', 'PARTIALLY_PAID'] },
        due_date: { lt: today },
      },
      include: {
        apartment: { select: { apartment_code: true } },
        contract: { include: { tenant: { select: { full_name: true } } } },
      },
    });

    if (overdueInvoices.length > 0) {
      await prisma.invoices.updateMany({
        where: { id: { in: overdueInvoices.map((i) => i.id) } },
        data: { status: 'OVERDUE' },
      });
      console.log(`[CRON] Đã cập nhật ${overdueInvoices.length} hóa đơn sang OVERDUE.`);

      const managerIds = await getManagerIds();
      for (const invoice of overdueInvoices) {
        for (const userId of managerIds) {
          await createNotification({
            userId,
            title: 'Hóa đơn quá hạn',
            message: `Hóa đơn ${invoice.invoice_code} căn hộ ${invoice.apartment.apartment_code} (${invoice.contract?.tenant?.full_name}) đã quá hạn thanh toán.`,
            type: 'INVOICE_OVERDUE',
            entityType: 'Invoice',
            entityId: invoice.id,
          });
        }
      }
    }

  } catch (error) {
    console.error('[CRON] Lỗi khi chạy rà soát hợp đồng/hóa đơn:', error);
  }
});
