import eventHub from '@my/events';
import { prisma } from '@my/prisma';
import { createNotification } from './service.js';

// Helper lấy danh sách admin và manager
const getAdminAndManagerIds = async () => {
  const users = await prisma.users.findMany({
    where: {
      role: { in: ['ADMIN', 'MANAGER'] },
      is_active: true
    },
    select: { id: true }
  });
  return users.map(u => u.id);
};

const registerNotificationListeners = () => {
  // 1. contract.created
  eventHub.on('contract.created', async (event) => {
    const receivers = await getAdminAndManagerIds();
    for (const userId of receivers) {
      await createNotification({
        userId,
        title: 'Hợp đồng mới được tạo',
        message: `Hợp đồng mã ${event.data?.contract_code} đã được tạo thành công cho căn hộ.`,
        type: 'CONTRACT_CREATED',
        entityType: 'Contract',
        entityId: event.entityId
      });
    }
  });

  // 2. invoice.paid
  eventHub.on('invoice.paid', async (event) => {
    const receivers = await getAdminAndManagerIds();
    for (const userId of receivers) {
      await createNotification({
        userId,
        title: 'Hóa đơn đã được thanh toán',
        message: `Hóa đơn mã ${event.data?.invoiceCode} tháng ${event.data?.billingMonth} đã thanh toán thành công số tiền ${event.data?.paymentAmount ? Number(event.data.paymentAmount).toLocaleString('vi-VN') : ''} VND.`,
        type: 'PAYMENT_RECEIVED',
        entityType: 'Invoice',
        entityId: event.entityId
      });
    }
  });

  // 3. maintenance.assigned
  eventHub.on('maintenance.assigned', async (event) => {
    if (event.data?.assignedTo) {
      await createNotification({
        userId: Number(event.data.assignedTo),
        title: 'Bạn được phân công sự cố mới',
        message: `Bạn đã được phân công xử lý yêu cầu bảo trì: "${event.data?.title}".`,
        type: 'MAINTENANCE_ASSIGNED',
        entityType: 'ServiceRequest',
        entityId: event.entityId
      });
    }
  });

  // 4. maintenance.completed
  eventHub.on('maintenance.completed', async (event) => {
    const receivers = await getAdminAndManagerIds();
    for (const userId of receivers) {
      await createNotification({
        userId,
        title: 'Sự cố kỹ thuật đã hoàn thành',
        message: `Yêu cầu bảo trì "${event.data?.title}" đã được kỹ thuật viên xử lý xong.`,
        type: 'MAINTENANCE_RESOLVED',
        entityType: 'ServiceRequest',
        entityId: event.entityId
      });
    }
  });
};

registerNotificationListeners();
console.log('[Notifications Backend] Event listeners registered.');
