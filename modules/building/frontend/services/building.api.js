// modules/building/frontend/services/building.api.js
import { api } from '@/lib/axios.js';

// ── Buildings ──────────────────────────────────────────────────────────────────
export async function getBuildings(params = {}) {
  const res = await api.get('/building/buildings', { params });
  return res.data.data;
}

export async function getBuildingById(id) {
  const res = await api.get(`/building/buildings/${id}`);
  return res.data.data;
}

export async function createBuilding(data) {
  const res = await api.post('/building/buildings', data);
  return res.data.data;
}

export async function updateBuilding(id, data) {
  const res = await api.put(`/building/buildings/${id}`, data);
  return res.data.data;
}

// ── Floors ─────────────────────────────────────────────────────────────────────
export async function getFloorsByBuilding(buildingId) {
  const res = await api.get(`/building/buildings/${buildingId}/floors`);
  return res.data.data;
}

export async function bulkCreateFloors(buildingId, data) {
  const res = await api.post(`/building/buildings/${buildingId}/floors`, data);
  return res.data.data;
}

// ── Apartments ─────────────────────────────────────────────────────────────────
export async function getApartments(params = {}) {
  const res = await api.get('/building/apartments', { params });
  return res.data.data;
}

export async function getApartmentById(id) {
  const res = await api.get(`/building/apartments/${id}`);
  return res.data.data;
}

export async function createApartment(data) {
  const res = await api.post('/building/apartments', data);
  return res.data.data;
}

export async function updateApartment(id, data) {
  const res = await api.put(`/building/apartments/${id}`, data);
  return res.data.data;
}

export async function updateApartmentStatus(id, new_status, reason) {
  const res = await api.patch(`/building/apartments/${id}/status`, { new_status, reason });
  return res.data.data;
}

export async function getApartmentStatusLogs(id) {
  const res = await api.get(`/building/apartments/${id}/status-logs`);
  return res.data.data;
}

// ── Furniture ──────────────────────────────────────────────────────────────────
export async function getFurniture(apartmentId) {
  const res = await api.get(`/building/apartments/${apartmentId}/furniture`);
  return res.data.data;
}

export async function addFurniture(apartmentId, data) {
  const res = await api.post(`/building/apartments/${apartmentId}/furniture`, data);
  return res.data.data;
}

export async function updateFurniture(furnitureId, data) {
  const res = await api.put(`/building/furniture/${furnitureId}`, data);
  return res.data.data;
}

export async function deleteFurniture(furnitureId) {
  const res = await api.delete(`/building/furniture/${furnitureId}`);
  return res.data;
}
