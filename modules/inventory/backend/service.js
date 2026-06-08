import { prisma, notDeleted } from '@my/prisma';
import eventHub from '@my/events';
import { applyBuildingScope } from '@my/policy-backend';

// ─── WAREHOUSES ──────────────────────────────────────────

export const getWarehouses = async ({ page = 1, limit = 20, search, building_id } = {}, currentUser) => {
  let where = { ...notDeleted };
  
  if (building_id) {
    where.building_id = Number(building_id);
  }
  
  if (search) {
    where.name = { contains: search };
  }

  where = await applyBuildingScope(currentUser, where, 'Warehouse');

  const [items, total] = await Promise.all([
    prisma.warehouses.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        building: { select: { id: true, name: true, code: true } }
      }
    }),
    prisma.warehouses.count({ where })
  ]);

  return { items, total, page, limit };
};

export const getWarehouseById = async (id) => {
  return prisma.warehouses.findFirst({
    where: { id: Number(id), ...notDeleted },
    include: {
      building: { select: { id: true, name: true, code: true } }
    }
  });
};

export const createWarehouse = async (data, userId) => {
  return prisma.warehouses.create({
    data: {
      name: data.name,
      building_id: Number(data.building_id),
      description: data.description || null,
      created_by: userId
    }
  });
};

export const updateWarehouse = async (id, data, userId) => {
  return prisma.warehouses.update({
    where: { id: Number(id) },
    data: {
      name: data.name,
      building_id: data.building_id ? Number(data.building_id) : undefined,
      description: data.description !== undefined ? data.description : undefined,
      updated_by: userId
    }
  });
};

export const deleteWarehouse = async (id, userId) => {
  const warehouse = await prisma.warehouses.findFirst({
    where: { id: Number(id), ...notDeleted }
  });
  if (!warehouse) throw new Error('Không tìm thấy kho');
  return prisma.warehouses.update({
    where: { id: Number(id) },
    data: { deleted_at: new Date(), deleted_by: userId }
  });
};

// ─── INVENTORY ITEMS ──────────────────────────────────────

export const getInventoryItems = async ({ page = 1, limit = 20, search, warehouse_id, category } = {}, currentUser) => {
  let where = { ...notDeleted };

  if (warehouse_id) {
    where.warehouse_id = Number(warehouse_id);
  }
  if (category) {
    where.category = category;
  }
  if (search) {
    where.item_name = { contains: search };
  }

  where = await applyBuildingScope(currentUser, where, 'InventoryItem');

  const [items, total] = await Promise.all([
    prisma.inventoryItems.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { item_name: 'asc' },
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
            building: { select: { id: true, name: true, code: true } }
          }
        }
      }
    }),
    prisma.inventoryItems.count({ where })
  ]);

  return { items, total, page, limit };
};

export const getInventoryItemById = async (id) => {
  return prisma.inventoryItems.findFirst({
    where: { id: Number(id), ...notDeleted },
    include: {
      warehouse: {
        select: {
          id: true,
          name: true,
          building: { select: { id: true, name: true, code: true } }
        }
      }
    }
  });
};

export const createInventoryItem = async (data, userId) => {
  return prisma.inventoryItems.create({
    data: {
      warehouse_id: Number(data.warehouse_id),
      item_name: data.item_name,
      category: data.category,
      current_stock: data.current_stock !== undefined ? Number(data.current_stock) : 0,
      min_stock_level: data.min_stock_level !== undefined ? Number(data.min_stock_level) : 0,
      unit: data.unit,
      unit_cost: Number(data.unit_cost),
      created_by: userId
    }
  });
};

export const updateInventoryItem = async (id, data, userId) => {
  return prisma.inventoryItems.update({
    where: { id: Number(id) },
    data: {
      warehouse_id: data.warehouse_id ? Number(data.warehouse_id) : undefined,
      item_name: data.item_name,
      category: data.category,
      min_stock_level: data.min_stock_level !== undefined ? Number(data.min_stock_level) : undefined,
      unit: data.unit,
      unit_cost: data.unit_cost !== undefined ? Number(data.unit_cost) : undefined,
      updated_by: userId
    }
  });
};

export const deleteInventoryItem = async (id, userId) => {
  const item = await prisma.inventoryItems.findFirst({
    where: { id: Number(id), ...notDeleted }
  });
  if (!item) throw new Error('Không tìm thấy vật tư');
  return prisma.inventoryItems.update({
    where: { id: Number(id) },
    data: { deleted_at: new Date(), deleted_by: userId }
  });
};

// ─── STOCK TRANSACTIONS ───────────────────────────────────

export const getStockTransactions = async ({ page = 1, limit = 20, inventory_item_id, type } = {}, currentUser) => {
  let where = {};

  if (inventory_item_id) {
    where.inventory_item_id = Number(inventory_item_id);
  }
  if (type) {
    where.type = type;
  }

  // StockTransactions are linked to InventoryItems, so we filter InventoryItems based on building assignment first
  const allowedItemsWhere = await applyBuildingScope(currentUser, {}, 'InventoryItem');
  where.inventory_item = allowedItemsWhere;

  const [items, total] = await Promise.all([
    prisma.stockTransactions.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        inventory_item: {
          select: {
            id: true,
            item_name: true,
            unit: true,
            warehouse: { select: { id: true, name: true } }
          }
        },
        recorder: { select: { id: true, full_name: true, role: true } }
      }
    }),
    prisma.stockTransactions.count({ where })
  ]);

  return { items, total, page, limit };
};

export const recordStockTransaction = async ({
  inventory_item_id,
  type,
  quantity,
  ref_type,
  ref_id = null,
  note = null,
  recorded_by
}) => {
  const itemId = Number(inventory_item_id);
  const qty = Number(quantity);
  const userId = Number(recorded_by);

  if (qty <= 0) throw new Error("Số lượng giao dịch phải lớn hơn 0");

  return prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItems.findUnique({
      where: { id: itemId },
      include: { warehouse: true }
    });
    if (!item) throw new Error("Không tìm thấy vật tư trong kho");

    if (type === 'STOCK_OUT') {
      const result = await tx.inventoryItems.updateMany({
        where: { id: itemId, current_stock: { gte: qty } },
        data: { current_stock: { decrement: qty } }
      });
      if (result.count === 0) {
        throw new Error("Không đủ số lượng tồn kho để xuất");
      }
    } else if (type === 'STOCK_IN') {
      await tx.inventoryItems.update({
        where: { id: itemId },
        data: { current_stock: { increment: qty } }
      });
    } else {
      throw new Error("Loại giao dịch không hợp lệ");
    }

    const transaction = await tx.stockTransactions.create({
      data: {
        inventory_item_id: itemId,
        type,
        quantity: qty,
        unit_cost: item.unit_cost,
        item_name_snapshot: item.item_name,
        ref_type,
        ref_id: ref_id ? Number(ref_id) : null,
        note,
        recorded_by: userId
      }
    });

    const updatedStock = type === 'STOCK_OUT' ? item.current_stock - qty : item.current_stock + qty;

    // Emit event low stock
    if (type === 'STOCK_OUT' && updatedStock <= item.min_stock_level) {
      eventHub.emit('inventory.low_stock', {
        entityId: itemId,
        actorId: userId,
        data: {
          itemId,
          itemName: item.item_name,
          currentStock: updatedStock,
          minStockLevel: item.min_stock_level,
          buildingId: item.warehouse.building_id
        }
      });
    }

    // Emit events for audit log
    eventHub.emit(type === 'STOCK_IN' ? 'inventory.stock_in' : 'inventory.stock_out', {
      entityId: transaction.id,
      actorId: userId,
      data: {
        itemId,
        itemName: item.item_name,
        quantity: qty,
        unitCost: Number(item.unit_cost),
        type,
        refType: ref_type,
        refId: ref_id
      }
    });

    return transaction;
  });
};
