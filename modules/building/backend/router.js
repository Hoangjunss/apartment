import { Router } from 'express';
import { authenticate, requireRole } from '@my/auth-backend';
import * as ctrl from './controller.js';

const router = Router();

// ==========================================
// BUILDINGS
// ==========================================
router.get('/buildings', authenticate, ctrl.getBuildings);
router.get('/buildings/:id', authenticate, ctrl.getBuildingById);
router.post('/buildings', authenticate, requireRole(['ADMIN']), ctrl.createBuilding);
router.put('/buildings/:id', authenticate, requireRole(['ADMIN', 'MANAGER']), ctrl.updateBuilding);

// FLOORS (Nested under buildings)
router.get('/buildings/:buildingId/floors', authenticate, ctrl.getFloorsByBuildingId);
router.post('/buildings/:buildingId/floors', authenticate, requireRole(['ADMIN', 'MANAGER']), ctrl.bulkCreateFloors);

// ==========================================
// APARTMENTS
// ==========================================
router.get('/apartments', authenticate, ctrl.getApartments);
router.get('/apartments/:id', authenticate, ctrl.getApartmentById);
router.post('/apartments', authenticate, requireRole(['ADMIN', 'MANAGER']), ctrl.createApartment);
router.put('/apartments/:id', authenticate, requireRole(['ADMIN', 'MANAGER']), ctrl.updateApartment);
router.patch('/apartments/:id/status', authenticate, requireRole(['ADMIN', 'MANAGER']), ctrl.updateApartmentStatus);
router.get('/apartments/:id/status-logs', authenticate, requireRole(['ADMIN', 'MANAGER']), ctrl.getApartmentStatusLogs);

// FURNITURE (Nested under apartments)
router.get('/apartments/:id/furniture', authenticate, ctrl.getFurnitureByApartmentId);
router.post('/apartments/:id/furniture', authenticate, requireRole(['ADMIN', 'MANAGER']), ctrl.addFurniture);

// ==========================================
// FURNITURE (Direct access)
// ==========================================
router.put('/furniture/:id', authenticate, requireRole(['ADMIN', 'MANAGER']), ctrl.updateFurniture);
router.delete('/furniture/:id', authenticate, requireRole(['ADMIN']), ctrl.deleteFurniture);

export default router;
