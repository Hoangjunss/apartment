import { api } from '@/lib/axios.js';

export async function getAssets(params = {}) {
  const res = await api.get('/assets/assets', { params });
  return res.data.data;
}

export async function getAssetById(id) {
  const res = await api.get(`/assets/assets/${id}`);
  return res.data.data;
}

export async function getAssetByCode(code) {
  const res = await api.get(`/assets/assets/code/${code}`);
  return res.data.data;
}

export async function createAsset(data) {
  const res = await api.post('/assets/assets', data);
  return res.data.data;
}

export async function updateAsset(id, data) {
  const res = await api.put(`/assets/assets/${id}`, data);
  return res.data.data;
}

export async function deleteAsset(id) {
  const res = await api.delete(`/assets/assets/${id}`);
  return res.data;
}

export async function getAssetTimeline(id) {
  const res = await api.get(`/assets/assets/${id}/timeline`);
  return res.data.data;
}

export async function getAssetAttachments(id) {
  const res = await api.get(`/assets/assets/${id}/attachments`);
  return res.data.data;
}
