import { Router } from 'express';
import { authenticate, requireRole } from '@my/auth-backend';
import * as ctrl from './controller.js';
import { getAuditHistory } from '@my/audit-log-backend/service';
import { checkPolicy, buildingGuard } from '@my/policy-backend';

const router = Router();

// ==========================================
// BUILDINGS
// ==========================================
router.get('/buildings/my', authenticate, ctrl.getMyBuildings);
router.get('/buildings', authenticate, ctrl.getBuildings);
router.get('/buildings/:id', authenticate, checkPolicy('Building', 'read'), ctrl.getBuildingById);
router.post('/buildings', authenticate, requireRole(['ADMIN']), ctrl.createBuilding);
router.put('/buildings/:id', authenticate, requireRole(['ADMIN', 'MANAGER']), checkPolicy('Building', 'update'), ctrl.updateBuilding);

// FLOORS (Nested under buildings)
router.get('/buildings/:buildingId/floors', authenticate, buildingGuard(req => req.params.buildingId), ctrl.getFloorsByBuildingId);
router.post('/buildings/:buildingId/floors', authenticate, requireRole(['ADMIN', 'MANAGER']), buildingGuard(req => req.params.buildingId), ctrl.bulkCreateFloors);

// ==========================================
// APARTMENTS
// ==========================================
router.get('/apartments', authenticate, buildingGuard(null, { required: false }), ctrl.getApartments);
router.get('/apartments/room-types', authenticate, ctrl.getDistinctRoomTypes);
router.get('/apartments/check-code', authenticate, ctrl.checkApartmentCode);
router.get('/apartments/:id/preview', authenticate, checkPolicy('Apartment', 'read'), ctrl.getApartmentPreview);
router.get('/apartments/:id', authenticate, checkPolicy('Apartment', 'read'), ctrl.getApartmentById);
router.post('/apartments', authenticate, requireRole(['ADMIN', 'MANAGER']), buildingGuard(), ctrl.createApartment);
router.put('/apartments/:id', authenticate, requireRole(['ADMIN', 'MANAGER']), checkPolicy('Apartment', 'update'), ctrl.updateApartment);
router.patch('/apartments/:id/status', authenticate, requireRole(['ADMIN', 'MANAGER']), checkPolicy('Apartment', 'update'), ctrl.updateApartmentStatus);
router.get('/apartments/:id/status-logs', authenticate, requireRole(['ADMIN', 'MANAGER']), checkPolicy('Apartment', 'read'), ctrl.getApartmentStatusLogs);
router.post('/apartments/:id/generate-token', authenticate, requireRole(['ADMIN', 'MANAGER']), checkPolicy('Apartment', 'update'), ctrl.generateApartmentToken);

// Audit history của 1 căn hộ
router.get('/apartments/:id/audit-history', authenticate, requireRole(['ADMIN', 'MANAGER']), checkPolicy('Apartment', 'read'), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const data = await getAuditHistory('Apartment', +req.params.id, { page: +page, limit: +limit });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// FURNITURE (Nested under apartments)
router.get('/apartments/:id/furniture', authenticate, checkPolicy('Apartment', 'read'), ctrl.getFurnitureByApartmentId);
router.post('/apartments/:id/furniture', authenticate, requireRole(['ADMIN', 'MANAGER']), checkPolicy('Apartment', 'update'), ctrl.addFurniture);

// ==========================================
// FURNITURE (Direct access)
// ==========================================
router.put('/furniture/:id', authenticate, requireRole(['ADMIN', 'MANAGER']), ctrl.updateFurniture);
router.delete('/furniture/:id', authenticate, requireRole(['ADMIN']), ctrl.deleteFurniture);

export default router;
