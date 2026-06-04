import cron from 'node-cron';
import { prisma } from '@my/prisma';
import { createNotification } from './service.js';

// Lấy tất cả ADMIN và MANAGER để gửi thông báo nhắc nhở khi sự cố chưa phân công
const getManagerIds = async () => {
  const users = await prisma.users.findMany({
    where: { role: { in: ['ADMIN', 'MANAGER'] }, is_active: true },
    select: { id: true },
  });
  return users.map((u) => u.id);
};

// Chạy rà soát lịch sửa chữa kỹ thuật hàng ngày lúc 00:00
cron.schedule('0 0 * * *', async () => {
  console.log('[CRON] Bắt đầu rà soát lịch sửa chữa kỹ thuật (Yêu cầu kỹ thuật)...');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const twoDaysLater = new Date(today);
  twoDaysLater.setDate(today.getDate() + 2);
  twoDaysLater.setHours(23, 59, 59, 999);

  try {
    // Quét các yêu cầu kỹ thuật chưa hoàn thành (PENDING, ASSIGNED, IN_PROGRESS)
    // có scheduled_start_date nằm trong khoảng [today, twoDaysLater]
    const upcomingRequests = await prisma.serviceRequests.findMany({
      where: {
        status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] },
        scheduled_start_date: {
          gte: today,
          lte: twoDaysLater
        }
      },
      include: {
        apartment: { select: { apartment_code: true } }
      }
    });

    console.log(`[CRON] Tìm thấy ${upcomingRequests.length} yêu cầu kỹ thuật sắp đến hạn.`);

    for (const req of upcomingRequests) {
      // Tính số ngày còn lại đến ngày bắt đầu (nếu < 0 thì là hôm nay/quá khứ)
      const diffTime = new Date(req.scheduled_start_date).getTime() - today.getTime();
      const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      const daysStr = daysLeft === 0 ? 'hôm nay' : `trong vòng ${daysLeft} ngày tới`;

      if (req.assigned_to) {
        // 1. Nếu đã gán cho kỹ thuật viên -> Kiểm tra trùng lặp trước khi gửi nhắc nhở cho kỹ thuật viên đó
        const existing = await prisma.notifications.findFirst({
          where: {
            user_id: req.assigned_to,
            type: 'MAINTENANCE_REMINDER',
            entity_type: 'ServiceRequest',
            entity_id: req.id
          }
        });

        if (!existing) {
          await createNotification({
            userId: req.assigned_to,
            title: 'Nhắc nhở lịch sửa chữa sắp tới',
            message: `Căn hộ ${req.apartment?.apartment_code ?? ''}: Bạn có lịch sửa chữa "${req.title}" dự kiến bắt đầu vào ngày ${new Date(req.scheduled_start_date).toLocaleDateString('vi-VN')} (${daysStr}).`,
            type: 'MAINTENANCE_REMINDER',
            entityType: 'ServiceRequest',
            entityId: req.id
          });
          console.log(`[CRON] Đã tạo thông báo nhắc nhở kỹ thuật viên ${req.assigned_to} cho yêu cầu ID ${req.id}`);
        }
      } else {
        // 2. Nếu chưa gán -> Nhắc nhở tất cả các Admin & Manager
        const managerIds = await getManagerIds();
        for (const userId of managerIds) {
          const existing = await prisma.notifications.findFirst({
            where: {
              user_id: userId,
              type: 'MAINTENANCE_REMINDER',
              entity_type: 'ServiceRequest',
              entity_id: req.id
            }
          });

          if (!existing) {
            await createNotification({
              userId,
              title: 'Sự cố chưa phân công xử lý',
              message: `Căn hộ ${req.apartment?.apartment_code ?? ''}: Yêu cầu sửa chữa "${req.title}" dự kiến bắt đầu vào ngày ${new Date(req.scheduled_start_date).toLocaleDateString('vi-VN')} (${daysStr}) chưa được phân công.`,
              type: 'MAINTENANCE_REMINDER',
              entityType: 'ServiceRequest',
              entityId: req.id
            });
            console.log(`[CRON] Đã tạo thông báo nhắc nhở quản lý ${userId} cho yêu cầu chưa phân công ID ${req.id}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('[CRON] Lỗi khi chạy rà soát yêu cầu kỹ thuật sắp tới:', error);
  }
});
