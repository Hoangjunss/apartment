// modules/tenant/frontend/services/tenant.api.js
import { api } from '@/lib/axios.js';

export async function getTenants(params = {}) {
  const res = await api.get('/tenant/tenants', { params });
  return res.data.data;
}

export async function getTenantById(id) {
  const res = await api.get(`/tenant/tenants/${id}`);
  return res.data.data;
}

export async function createTenant(data) {
  const res = await api.post('/tenant/tenants', data);
  return res.data.data;
}

export async function updateTenant(id, data) {
  const res = await api.put(`/tenant/tenants/${id}`, data);
  return res.data.data;
}

export async function getTenantHistory(id) {
  const res = await api.get(`/tenant/tenants/${id}/history`);
  return res.data.data;
}

export async function getRegistrationsByTenant(tenantId) {
  const res = await api.get(`/tenant/tenants/${tenantId}/registrations`);
  return res.data.data;
}

export async function createRegistration(tenantId, data) {
  const res = await api.post(`/tenant/tenants/${tenantId}/registrations`, data);
  return res.data.data;
}
