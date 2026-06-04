import { Router } from 'express';
import { authenticate, requireRole } from '@my/auth-backend';
import * as ctrl from './controller.js';
import { getAuditHistory } from '@my/audit-log-backend/service';
import { checkPolicy } from '@my/policy-backend';

const router = Router();

const MGT_ROLES = ['ADMIN', 'MANAGER'];
const ALL_ROLES = ['ADMIN', 'MANAGER', 'RECEPTIONIST'];

// Danh sách hợp đồng
router.get('/', authenticate, requireRole(MGT_ROLES), ctrl.getContracts);

// Hợp đồng sắp hết hạn (API này phải để trước /:id)
router.get('/expiring-soon', authenticate, requireRole(MGT_ROLES), ctrl.getExpiringSoon);

// Chi tiết 1 hợp đồng
router.get('/:id', authenticate, requireRole(ALL_ROLES), checkPolicy('Contract', 'read'), ctrl.getContractById);

// Tạo mới
router.post('/', authenticate, requireRole(MGT_ROLES), ctrl.createContract);

// Cập nhật điều khoản cơ bản
router.put('/:id', authenticate, requireRole(MGT_ROLES), checkPolicy('Contract', 'update'), ctrl.updateContract);

// Vòng đời hợp đồng
router.patch('/:id/terminate', authenticate, requireRole(MGT_ROLES), checkPolicy('Contract', 'delete'), ctrl.terminateContract);
router.post('/:id/renew', authenticate, requireRole(MGT_ROLES), checkPolicy('Contract', 'update'), ctrl.renewContract);
router.get('/:id/renewals', authenticate, requireRole(MGT_ROLES), checkPolicy('Contract', 'read'), ctrl.getRenewals);

// Audit history — lịch sử thay đổi của 1 hợp đồng
router.get('/:id/audit-history', authenticate, requireRole(ALL_ROLES), checkPolicy('Contract', 'read'), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const data = await getAuditHistory('Contract', +req.params.id, { page: +page, limit: +limit });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
