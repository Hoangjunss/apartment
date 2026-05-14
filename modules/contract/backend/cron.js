import cron from 'node-cron';
import { prisma } from '@my/prisma';

// Chạy hàng ngày lúc 00:00
cron.schedule('0 0 * * *', async () => {
  console.log('[CRON] Bắt đầu rà soát trạng thái Hợp đồng...');
  const today = new Date();
  
  // in30Days: Ngày hiện tại cộng thêm 30 ngày
  const in30Days = new Date(today);
  in30Days.setDate(today.getDate() + 30);

  try {
    // 1. ACTIVE -> EXPIRING_SOON (Chỉ còn <= 30 ngày)
    const expiringResult = await prisma.contracts.updateMany({
      where: {
        status: 'ACTIVE',
        end_date: { lte: in30Days, gte: today },
      },
      data: { status: 'EXPIRING_SOON' },
    });
    console.log(`[CRON] Đã cập nhật ${expiringResult.count} hợp đồng sang EXPIRING_SOON.`);

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
    // Lấy danh sách các hợp đồng hết hạn trong 1-2 ngày vừa qua để tránh lặp lại toàn bộ quá trình lịch sử
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
      
      // Có thể log lại nếu cần
      await prisma.apartmentStatusLogs.create({
        data: {
          apartment_id: c.apartment_id,
          old_status: 'OCCUPIED',
          new_status: 'AVAILABLE',
          changed_by: 1, // System ID (hoặc null nếu thiết kế cho phép null)
          reason: `Trả phòng tự động do Hợp đồng ${c.contract_code} hết hạn`,
        }
      });
    }
    console.log(`[CRON] Đã giải phóng ${freeApartmentCount} căn hộ về AVAILABLE.`);

  } catch (error) {
    console.error('[CRON] Lỗi khi chạy rà soát hợp đồng:', error);
  }
});
