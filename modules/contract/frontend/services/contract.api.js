// modules/contract/frontend/services/contract.api.js
import { api } from '@/lib/axios.js';

export async function getContracts(params = {}) {
  const res = await api.get('/contract', { params });
  return res.data.data;
}

export async function getContractById(id) {
  const res = await api.get(`/contract/${id}`);
  return res.data.data;
}

export async function getExpiringSoon() {
  const res = await api.get('/contract/expiring-soon');
  return res.data.data;
}

export async function createContract(data) {
  const res = await api.post('/contract', data);
  return res.data.data;
}

export async function updateContract(id, data) {
  const res = await api.put(`/contract/${id}`, data);
  return res.data.data;
}

export async function terminateContract(id, termination_reason) {
  const res = await api.patch(`/contract/${id}/terminate`, { termination_reason });
  return res.data.data;
}

export async function renewContract(id, data) {
  const res = await api.post(`/contract/${id}/renew`, data);
  return res.data.data;
}

export async function getRenewals(contractId) {
  const res = await api.get(`/contract/${contractId}/renewals`);
  return res.data.data;
}
