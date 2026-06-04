import { prisma } from '@my/prisma';
import { createNotification } from '@my/notifications-backend/service';

// Đánh giá một bản ghi dữ liệu có thỏa mãn điều kiện quy tắc phẳng hay không
export const evaluateRule = (condition, data) => {
  if (!condition || !condition.field || !condition.operator) return false;

  const { field, operator, value } = condition;
  const dataValue = data[field];

  switch (operator) {
    case '==':
    case 'equals':
      return dataValue == value;
    case '!=':
    case 'not_equals':
      return dataValue != value;
    case '>':
      return Number(dataValue) > Number(value);
    case '>=':
      return Number(dataValue) >= Number(value);
    case '<':
      return Number(dataValue) < Number(value);
    case '<=':
      return Number(dataValue) <= Number(value);
    case 'in':
      return Array.isArray(value) ? value.includes(dataValue) : false;
    case 'not_in':
      return Array.isArray(value) ? !value.includes(dataValue) : true;
    default:
      console.warn(`[RulesEngine] Unsupported operator: ${operator}`);
      return false;
  }
};

// Quét và thực thi các quy tắc dạng thời gian (Scheduled Rules)
export const runScheduledRules = async () => {
  console.log('[RulesEngine] Running scheduled rules scan...');
  try {
    const activeRules = await prisma.businessRules.findMany({
      where: { is_active: true }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const rule of activeRules) {
      const condition = rule.condition; // JSON dạng { field, operator, value }
      if (!condition) continue;

      if (rule.entity === 'Contract') {
        // Rule ví dụ: days_remaining <= 30
        if (condition.field === 'days_remaining' && condition.operator === '<=') {
          const daysLimit = Number(condition.value);
          const targetDate = new Date(today);
          targetDate.setDate(today.getDate() + daysLimit);

          // Tìm hợp đồng ACTIVE kết thúc từ hôm nay đến today + daysLimit
          const contracts = await prisma.contracts.findMany({
            where: {
              status: 'ACTIVE',
              end_date: {
                gte: today,
                lte: targetDate
              }
            },
            include: {
              tenant: true,
              apartment: true
            }
          });

          for (const contract of contracts) {
            const diffTime = contract.end_date.getTime() - today.getTime();
            const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Tạo thông báo
            const template = rule.action_data?.template || 'Hợp đồng {contract_code} sắp hết hạn.';
            const message = template
              .replace('{contract_code}', contract.contract_code)
              .replace('{apartment_code}', contract.apartment.apartment_code)
              .replace('{days_remaining}', daysRemaining);

            // Kiểm tra trùng lặp trước khi tạo
            const existingNotif = await prisma.notifications.findFirst({
              where: {
                user_id: contract.created_by,
                type: 'CONTRACT_EXPIRING_RULE',
                entity_type: 'Contract',
                entity_id: contract.id,
                created_at: { gte: today } // Tránh spam trong cùng 1 ngày
              }
            });

            if (!existingNotif) {
              await createNotification({
                userId: contract.created_by,
                title: rule.name,
                message,
                type: 'CONTRACT_EXPIRING_RULE',
                entityType: 'Contract',
                entityId: contract.id
              });
            }
          }
        }
      } 
      
      else if (rule.entity === 'ServiceRequest') {
        // Rule ví dụ: days_to_start <= 2
        if (condition.field === 'days_to_start' && condition.operator === '<=') {
          const daysLimit = Number(condition.value);
          const targetDate = new Date(today);
          targetDate.setDate(today.getDate() + daysLimit);

          const requests = await prisma.serviceRequests.findMany({
            where: {
              status: 'PENDING',
              scheduled_start_date: {
                gte: today,
                lte: targetDate
              }
            }
          });

          for (const request of requests) {
            const startDate = request.scheduled_start_date ? new Date(request.scheduled_start_date) : today;
            startDate.setHours(0, 0, 0, 0);
            const diffTime = startDate.getTime() - today.getTime();
            const daysToStart = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            const template = rule.action_data?.template || 'Yêu cầu bảo trì sắp đến hạn.';
            const message = template
              .replace('{title}', request.title)
              .replace('{scheduled_start_date}', startDate.toLocaleDateString('vi-VN'));

            let receivers = [];
            if (request.assigned_to) {
              receivers.push(request.assigned_to);
            } else {
              const admins = await prisma.users.findMany({
                where: { role: { in: ['ADMIN', 'MANAGER'] }, is_active: true },
                select: { id: true }
              });
              receivers = admins.map(a => a.id);
            }

            for (const receiverId of receivers) {
              const existingNotif = await prisma.notifications.findFirst({
                where: {
                  user_id: receiverId,
                  type: 'MAINTENANCE_REMINDER_RULE',
                  entity_type: 'ServiceRequest',
                  entity_id: request.id,
                  created_at: { gte: today }
                }
              });

              if (!existingNotif) {
                await createNotification({
                  userId: receiverId,
                  title: rule.name,
                  message,
                  type: 'MAINTENANCE_REMINDER_RULE',
                  entityType: 'ServiceRequest',
                  entityId: request.id
                });
              }
            }
          }
        }
      } 
      
      else if (rule.entity === 'Invoice') {
        // Rule ví dụ: days_overdue >= 1
        if (condition.field === 'days_overdue' && condition.operator === '>=') {
          const overdueLimit = Number(condition.value);
          const targetDate = new Date(today);
          targetDate.setDate(today.getDate() - overdueLimit);

          const invoices = await prisma.invoices.findMany({
            where: {
              status: { in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] },
              due_date: { lt: today }
            },
            include: {
              contract: true,
              apartment: true
            }
          });

          for (const invoice of invoices) {
            const diffTime = today.getTime() - invoice.due_date.getTime();
            const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (daysOverdue >= overdueLimit) {
              if (invoice.status !== 'OVERDUE') {
                await prisma.invoices.update({
                  where: { id: invoice.id },
                  data: { status: 'OVERDUE' }
                });
              }

              const template = rule.action_data?.template || 'Hóa đơn quá hạn thanh toán.';
              const message = template
                .replace('{invoice_code}', invoice.invoice_code)
                .replace('{days_overdue}', daysOverdue);

              const admins = await prisma.users.findMany({
                where: { role: { in: ['ADMIN', 'MANAGER'] }, is_active: true },
                select: { id: true }
              });
              const receivers = new Set([invoice.created_by, ...admins.map(a => a.id)]);

              for (const receiverId of receivers) {
                const existingNotif = await prisma.notifications.findFirst({
                  where: {
                    user_id: receiverId,
                    type: 'INVOICE_OVERDUE_RULE',
                    entity_type: 'Invoice',
                    entity_id: invoice.id,
                    created_at: { gte: today }
                  }
                });

                if (!existingNotif) {
                  await createNotification({
                    userId: receiverId,
                    title: rule.name,
                    message,
                    type: 'INVOICE_OVERDUE_RULE',
                    entityType: 'Invoice',
                    entityId: invoice.id
                  });
                }
              }
            }
          }
        }
      }
    }
    console.log('[RulesEngine] Scheduled rules scan completed.');
  } catch (err) {
    console.error('[RulesEngine] Error running scheduled rules:', err.message);
  }
};

// CRUD API cho Business Rules
export const getAllRules = async () => {
  return prisma.businessRules.findMany({
    orderBy: { created_at: 'desc' }
  });
};

export const createRule = async (data) => {
  return prisma.businessRules.create({
    data: {
      name: data.name,
      entity: data.entity,
      condition: data.condition,
      action: data.action,
      action_data: data.action_data || null,
      is_active: data.is_active !== undefined ? !!data.is_active : true
    }
  });
};

export const updateRule = async (id, data) => {
  return prisma.businessRules.update({
    where: { id: Number(id) },
    data
  });
};

export const deleteRule = async (id) => {
  return prisma.businessRules.delete({
    where: { id: Number(id) }
  });
};
