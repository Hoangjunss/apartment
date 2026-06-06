import router from './router.js';
export { checkPolicy, assertBuildingAccess, buildingGuard } from './middleware.js';
export { applyBuildingScope, getAssignedBuildingIds } from './service.js';
export default router;
