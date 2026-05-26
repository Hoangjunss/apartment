import cron from 'node-cron';
import { prisma } from '@my/prisma';

// Hàng ngày lúc 00:00
cron.schedule('0 0 * * *', async () => {
  console.log('[Cron] Bắt đầu chạy quét hợp đồng hết hạn...');
  try {
    const today = new Date();
    const in30Days = new Date(today);
    in30Days.setDate(today.getDate() + 30);

    // 1. ACTIVE → EXPIRING_SOON (≤ 30 ngày còn lại)
    const expiringCount = await prisma.contracts.updateMany({
      where: {
        status: 'ACTIVE',
        end_date: { lte: in30Days, gte: today },
      },
      data: { status: 'EXPIRING_SOON' },
    });
    console.log(`[Cron] Đã cập nhật ${expiringCount.count} hợp đồng sang sắp hết hạn (EXPIRING_SOON).`);

    // 2. → EXPIRED (đã qua end_date)
    const expiredCount = await prisma.contracts.updateMany({
      where: {
        status: { in: ['ACTIVE', 'EXPIRING_SOON'] },
        end_date: { lt: today },
      },
      data: { status: 'EXPIRED' },
    });
    console.log(`[Cron] Đã cập nhật ${expiredCount.count} hợp đồng sang đã hết hạn (EXPIRED).`);

    // 3. Set apartment AVAILABLE cho contract vừa EXPIRED
    // Lấy các hợp đồng có status EXPIRED kết thúc trong vòng 2 ngày qua để đảm bảo cập nhật đầy đủ
    const aDayAgo = new Date();
    aDayAgo.setDate(today.getDate() - 2);
    
    const expiredContracts = await prisma.contracts.findMany({
      where: {
        status: 'EXPIRED',
        end_date: { gte: aDayAgo }
      }
    });

    let releasedRoomsCount = 0;
    for (const c of expiredContracts) {
      const apt = await prisma.apartments.findUnique({ where: { id: c.apartment_id } });
      if (apt && apt.status === 'OCCUPIED') {
        await prisma.$transaction([
          prisma.apartments.update({
            where: { id: c.apartment_id },
            data: { status: 'AVAILABLE' }
          }),
          prisma.apartmentStatusLogs.create({
            data: {
              apartment_id: c.apartment_id,
              old_status: 'OCCUPIED',
              new_status: 'AVAILABLE',
              changed_by: 1, // ADMIN/Hệ thống mặc định
              reason: `Hợp đồng ${c.contract_code} hết hạn tự động`
            }
          })
        ]);
        releasedRoomsCount++;
      }
    }
    console.log(`[Cron] Đã giải phóng ${releasedRoomsCount} căn hộ về trạng thái trống (AVAILABLE).`);
  } catch (error) {
    console.error('[Cron] Lỗi trong quá trình quét hợp đồng:', error);
  }
});
