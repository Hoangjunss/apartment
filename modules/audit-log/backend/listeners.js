import eventHub from '@my/events';
import { createLog } from './service.js';

// Đăng ký lắng nghe sự kiện từ Event Hub
const registerListeners = () => {
  // Lắng nghe sự kiện Contract
  eventHub.on('contract.created', async (event) => {
    await createLog({
      actorId: event.actorId,
      action: 'CREATE',
      resourceType: 'Contract',
      resourceId: event.entityId,
      newData: event.data
    });
  });

  eventHub.on('contract.updated', async (event) => {
    await createLog({
      actorId: event.actorId,
      action: 'UPDATE',
      resourceType: 'Contract',
      resourceId: event.entityId,
      oldData: event.data?.oldData,
      newData: event.data?.newData
    });
  });

  eventHub.on('contract.terminated', async (event) => {
    await createLog({
      actorId: event.actorId,
      action: 'DELETE',
      resourceType: 'Contract',
      resourceId: event.entityId,
      oldData: event.data?.oldData,
      newData: event.data?.newData
    });
  });

  eventHub.on('contract.renewed', async (event) => {
    await createLog({
      actorId: event.actorId,
      action: 'UPDATE',
      resourceType: 'Contract',
      resourceId: event.entityId,
      oldData: event.data?.oldData,
      newData: event.data?.newData
    });
  });

  // Lắng nghe sự kiện Invoice
  eventHub.on('invoice.created', async (event) => {
    await createLog({
      actorId: event.actorId,
      action: 'CREATE',
      resourceType: 'Invoice',
      resourceId: event.entityId,
      newData: event.data
    });
  });

  eventHub.on('invoice.paid', async (event) => {
    await createLog({
      actorId: event.actorId,
      action: 'UPDATE',
      resourceType: 'Invoice',
      resourceId: event.entityId,
      oldData: event.data?.oldData,
      newData: event.data?.newData
    });
  });

  // Lắng nghe sự kiện Service Request (Maintenance)
  eventHub.on('maintenance.created', async (event) => {
    await createLog({
      actorId: event.actorId,
      action: 'CREATE',
      resourceType: 'ServiceRequest',
      resourceId: event.entityId,
      newData: event.data
    });
  });

  eventHub.on('maintenance.assigned', async (event) => {
    await createLog({
      actorId: event.actorId,
      action: 'UPDATE',
      resourceType: 'ServiceRequest',
      resourceId: event.entityId,
      oldData: event.data?.oldData,
      newData: event.data?.newData
    });
  });

  eventHub.on('maintenance.completed', async (event) => {
    await createLog({
      actorId: event.actorId,
      action: 'UPDATE',
      resourceType: 'ServiceRequest',
      resourceId: event.entityId,
      oldData: event.data?.oldData,
      newData: event.data?.newData
    });
  });

  eventHub.on('inventory.stock_in', async (event) => {
    await createLog({
      actorId: event.actorId,
      action: 'CREATE',
      resourceType: 'StockTransaction',
      resourceId: event.entityId,
      newData: event.data
    });
  });

  eventHub.on('inventory.stock_out', async (event) => {
    await createLog({
      actorId: event.actorId,
      action: 'CREATE',
      resourceType: 'StockTransaction',
      resourceId: event.entityId,
      newData: event.data
    });
  });
};

registerListeners();
console.log('[AuditLog Backend] Event listeners registered.');
