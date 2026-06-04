import eventHub from '@my/events';
import { prisma } from '@my/prisma';

// Hàm helper để tạo Timeline entry
const createTimelineEntry = async ({ entityType, entityId, title, description, actorId }) => {
  try {
    let actorName = 'Hệ thống';
    if (actorId) {
      const user = await prisma.users.findUnique({
        where: { id: Number(actorId) },
        select: { full_name: true }
      });
      if (user) {
        actorName = user.full_name;
      }
    }

    await prisma.timeline.create({
      data: {
        entity_type: entityType,
        entity_id: Number(entityId),
        title,
        description,
        actor_id: actorId ? Number(actorId) : null,
        actor_name: actorName
      }
    });
    console.log(`[Timeline] Created entry for ${entityType} #${entityId}: "${title}"`);
  } catch (err) {
    console.error('[Timeline] Failed to create entry:', err.message);
  }
};

const registerTimelineListeners = () => {
  // 1. Contract
  eventHub.on('contract.created', async (event) => {
    await createTimelineEntry({
      entityType: 'Contract',
      entityId: event.entityId,
      title: 'Hợp đồng được ký kết',
      description: `Hợp đồng mã ${event.data?.contract_code} bắt đầu hiệu lực từ ngày ${event.data?.start_date ? new Date(event.data.start_date).toLocaleDateString('vi-VN') : ''}.`,
      actorId: event.actorId
    });
  });

  eventHub.on('contract.renewed', async (event) => {
    await createTimelineEntry({
      entityType: 'Contract',
      entityId: event.entityId,
      title: 'Hợp đồng được gia hạn',
      description: `Hợp đồng được gia hạn đến ngày ${event.data?.new_end_date ? new Date(event.data.new_end_date).toLocaleDateString('vi-VN') : ''} với giá thuê mới: ${event.data?.new_monthly_rent ? Number(event.data.new_monthly_rent).toLocaleString('vi-VN') : ''} VND.`,
      actorId: event.actorId
    });
  });

  eventHub.on('contract.terminated', async (event) => {
    await createTimelineEntry({
      entityType: 'Contract',
      entityId: event.entityId,
      title: 'Hợp đồng chấm dứt sớm',
      description: `Hợp đồng bị chấm dứt. Lý do: ${event.data?.termination_reason || 'Không cung cấp'}`,
      actorId: event.actorId
    });
  });

  // 2. Invoice
  eventHub.on('invoice.created', async (event) => {
    await createTimelineEntry({
      entityType: 'Invoice',
      entityId: event.entityId,
      title: 'Hóa đơn được phát hành',
      description: `Phát hành hóa đơn ${event.data?.invoice_code} cho tháng ${event.data?.billing_month}. Tổng tiền: ${event.data?.total_amount ? Number(event.data.total_amount).toLocaleString('vi-VN') : ''} VND.`,
      actorId: event.actorId
    });
  });

  eventHub.on('invoice.paid', async (event) => {
    const paymentDesc = `Ghi nhận thanh toán số tiền ${event.data?.paymentAmount ? Number(event.data.paymentAmount).toLocaleString('vi-VN') : ''} VND qua hình thức ${event.data?.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt'}. Trạng thái hóa đơn mới: ${event.data?.newStatus}.`;
    await createTimelineEntry({
      entityType: 'Invoice',
      entityId: event.entityId,
      title: 'Hóa đơn được thanh toán',
      description: paymentDesc,
      actorId: event.actorId
    });

    if (event.data?.contractId) {
      await createTimelineEntry({
        entityType: 'Contract',
        entityId: event.data.contractId,
        title: 'Thanh toán hóa đơn tháng',
        description: `Hóa đơn mã ${event.data?.invoiceCode} (tháng ${event.data?.billingMonth}) đã được thanh toán số tiền ${event.data?.paymentAmount ? Number(event.data.paymentAmount).toLocaleString('vi-VN') : ''} VND.`,
        actorId: event.actorId
      });
    }
  });

  // 3. Service Requests (Maintenance)
  eventHub.on('maintenance.created', async (event) => {
    await createTimelineEntry({
      entityType: 'ServiceRequest',
      entityId: event.entityId,
      title: 'Yêu cầu được tạo mới',
      description: `Yêu cầu sửa chữa/dịch vụ "${event.data?.title}" được tạo trên hệ thống với độ ưu tiên ${event.data?.priority}.`,
      actorId: event.actorId
    });
  });

  eventHub.on('maintenance.assigned', async (event) => {
    let techName = `Kỹ thuật viên #${event.data?.assignedTo}`;
    if (event.data?.assignedTo) {
      const user = await prisma.users.findUnique({
        where: { id: Number(event.data.assignedTo) },
        select: { full_name: true }
      });
      if (user) techName = user.full_name;
    }
    await createTimelineEntry({
      entityType: 'ServiceRequest',
      entityId: event.entityId,
      title: 'Phân công nhân sự xử lý',
      description: `Yêu cầu được giao cho ${techName} xử lý.`,
      actorId: event.actorId
    });
  });

  eventHub.on('maintenance.completed', async (event) => {
    await createTimelineEntry({
      entityType: 'ServiceRequest',
      entityId: event.entityId,
      title: 'Đã xử lý xong yêu cầu',
      description: `Trạng thái yêu cầu chuyển thành RESOLVED. Hoàn thành công việc sửa chữa/vận hành.`,
      actorId: event.actorId
    });
  });
};

registerTimelineListeners();
console.log('[Timeline Backend] Event listeners registered.');
