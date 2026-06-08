import * as service from './service.js';

const getErrorStatus = (message) => {
  if (message.includes('Không tìm thấy')) return 404;
  if (message.includes('Không đủ số lượng') || message.includes('lớn hơn 0') || message.includes('không hợp lệ')) return 400;
  return 500;
};

// ─── WAREHOUSES ──────────────────────────────────────────

export const getWarehouses = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, building_id } = req.query;
    const data = await service.getWarehouses({
      page: +page,
      limit: +limit,
      search,
      building_id: building_id ? +building_id : undefined
    }, req.user);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getWarehouseById = async (req, res) => {
  try {
    const data = await service.getWarehouseById(+req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Không tìm thấy kho' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createWarehouse = async (req, res) => {
  try {
    const data = await service.createWarehouse(req.body, req.user.userId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};

export const updateWarehouse = async (req, res) => {
  try {
    const data = await service.updateWarehouse(+req.params.id, req.body, req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};

export const deleteWarehouse = async (req, res) => {
  try {
    await service.deleteWarehouse(+req.params.id, req.user.userId);
    res.json({ success: true, message: 'Xóa kho thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── INVENTORY ITEMS ──────────────────────────────────────

export const getInventoryItems = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, warehouse_id, category } = req.query;
    const data = await service.getInventoryItems({
      page: +page,
      limit: +limit,
      search,
      warehouse_id: warehouse_id ? +warehouse_id : undefined,
      category
    }, req.user);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getInventoryItemById = async (req, res) => {
  try {
    const data = await service.getInventoryItemById(+req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Không tìm thấy vật tư' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createInventoryItem = async (req, res) => {
  try {
    const data = await service.createInventoryItem(req.body, req.user.userId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};

export const updateInventoryItem = async (req, res) => {
  try {
    const data = await service.updateInventoryItem(+req.params.id, req.body, req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};

export const deleteInventoryItem = async (req, res) => {
  try {
    await service.deleteInventoryItem(+req.params.id, req.user.userId);
    res.json({ success: true, message: 'Xóa vật tư thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── STOCK TRANSACTIONS ───────────────────────────────────

export const getStockTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, inventory_item_id, type } = req.query;
    const data = await service.getStockTransactions({
      page: +page,
      limit: +limit,
      inventory_item_id: inventory_item_id ? +inventory_item_id : undefined,
      type
    }, req.user);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const recordStockTransaction = async (req, res) => {
  try {
    const data = await service.recordStockTransaction({
      ...req.body,
      recorded_by: req.user.userId
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};
