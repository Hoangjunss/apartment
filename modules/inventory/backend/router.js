import { Router } from 'express';
import { authenticate, requireRole } from '@my/auth-backend';
import { checkPolicy } from '@my/policy-backend';
import * as ctrl from './controller.js';

const router = Router();

const ALL_ROLES = ['ADMIN', 'MANAGER', 'TECHNICIAN', 'RECEPTIONIST'];
const MGT_ROLES = ['ADMIN', 'MANAGER'];
const TECH_ROLES = ['ADMIN', 'MANAGER', 'TECHNICIAN'];

// ─── WAREHOUSES ──────────────────────────────────────────
router.get('/warehouses', authenticate, ctrl.getWarehouses);
router.get('/warehouses/:id', authenticate, checkPolicy('Warehouse', 'read'), ctrl.getWarehouseById);
router.post('/warehouses', authenticate, requireRole(MGT_ROLES), ctrl.createWarehouse);
router.put('/warehouses/:id', authenticate, requireRole(MGT_ROLES), checkPolicy('Warehouse', 'update'), ctrl.updateWarehouse);
router.delete('/warehouses/:id', authenticate, requireRole(['ADMIN']), checkPolicy('Warehouse', 'delete'), ctrl.deleteWarehouse);

// ─── INVENTORY ITEMS ──────────────────────────────────────
router.get('/items', authenticate, ctrl.getInventoryItems);
router.get('/items/:id', authenticate, checkPolicy('InventoryItem', 'read'), ctrl.getInventoryItemById);
router.post('/items', authenticate, requireRole(MGT_ROLES), ctrl.createInventoryItem);
router.put('/items/:id', authenticate, requireRole(MGT_ROLES), checkPolicy('InventoryItem', 'update'), ctrl.updateInventoryItem);
router.delete('/items/:id', authenticate, requireRole(['ADMIN']), checkPolicy('InventoryItem', 'delete'), ctrl.deleteInventoryItem);

// ─── STOCK TRANSACTIONS ───────────────────────────────────
router.get('/transactions', authenticate, ctrl.getStockTransactions);
router.post('/transactions', authenticate, requireRole(TECH_ROLES), ctrl.recordStockTransaction);

export default router;
