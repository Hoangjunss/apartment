// src/lib/queryKeys.js
// Centralized query keys cho toàn bộ ứng dụng

export const QUERY_KEYS = {
  // ── Auth ──────────────────────────────────────────────
  me: ['me'],
  users: (params) => ['users', params],

  // ── Building ──────────────────────────────────────────
  buildings: (params) => ['buildings', params],
  building: (id) => ['buildings', id],
  buildingFloors: (buildingId) => ['buildings', buildingId, 'floors'],

  // ── Apartment ─────────────────────────────────────────
  apartments: (params) => ['apartments', params],
  apartment: (id) => ['apartments', id],
  apartmentStatusLogs: (id) => ['apartments', id, 'status-logs'],
  furniture: (apartmentId) => ['apartments', apartmentId, 'furniture'],

  // ── Tenant ────────────────────────────────────────────
  tenants: (params) => ['tenants', params],
  tenant: (id) => ['tenants', id],
  tenantHistory: (id) => ['tenants', id, 'history'],
  registrations: (tenantId) => ['tenants', tenantId, 'registrations'],

  // ── Contract ──────────────────────────────────────────
  contracts: (params) => ['contracts', params],
  contract: (id) => ['contracts', id],
  expiringSoon: ['contracts', 'expiring-soon'],
  renewals: (contractId) => ['contracts', contractId, 'renewals'],
};
