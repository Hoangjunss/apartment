// src/constants/roles.js

export const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  TECHNICIAN: 'TECHNICIAN',
  RECEPTIONIST: 'RECEPTIONIST',
};

// Nhóm role tiện dùng
export const MANAGEMENT_ROLES = [ROLES.ADMIN, ROLES.MANAGER];
export const TENANT_ACCESS_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.RECEPTIONIST];
export const CONTRACT_VIEW_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.RECEPTIONIST];
export const ALL_ROLES = Object.values(ROLES);

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Quản trị viên',
  [ROLES.MANAGER]: 'Quản lý',
  [ROLES.TECHNICIAN]: 'Kỹ thuật viên',
  [ROLES.RECEPTIONIST]: 'Lễ tân',
};
