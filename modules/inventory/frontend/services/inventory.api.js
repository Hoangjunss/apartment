import { api } from '@/lib/axios.js';

// ── Warehouses ──────────────────────────────────────────
export async function getWarehouses(params = {}) {
  const res = await api.get('/inventory/warehouses', { params });
  return res.data.data;
}

export async function getWarehouseById(id) {
  const res = await api.get(`/inventory/warehouses/${id}`);
  return res.data.data;
}

export async function createWarehouse(data) {
  const res = await api.post('/inventory/warehouses', data);
  return res.data.data;
}

export async function updateWarehouse(id, data) {
  const res = await api.put(`/inventory/warehouses/${id}`, data);
  return res.data.data;
}

export async function deleteWarehouse(id) {
  const res = await api.delete(`/inventory/warehouses/${id}`);
  return res.data;
}

// ── Inventory Items ──────────────────────────────────────
export async function getInventoryItems(params = {}) {
  const res = await api.get('/inventory/items', { params });
  return res.data.data;
}

export async function getInventoryItemById(id) {
  const res = await api.get(`/inventory/items/${id}`);
  return res.data.data;
}

export async function createInventoryItem(data) {
  const res = await api.post('/inventory/items', data);
  return res.data.data;
}

export async function updateInventoryItem(id, data) {
  const res = await api.put(`/inventory/items/${id}`, data);
  return res.data.data;
}

export async function deleteInventoryItem(id) {
  const res = await api.delete(`/inventory/items/${id}`);
  return res.data;
}

// ── Stock Transactions ───────────────────────────────────
export async function getStockTransactions(params = {}) {
  const res = await api.get('/inventory/transactions', { params });
  return res.data.data;
}

export async function recordStockTransaction(data) {
  const res = await api.post('/inventory/transactions', data);
  return res.data.data;
}
