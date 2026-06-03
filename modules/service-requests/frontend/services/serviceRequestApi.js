import { api } from '@/lib/axios.js';

export const serviceRequestApi = {
  getAll: (params = {}) => api.get('/service-requests', { params }),
  getMy: () => api.get('/service-requests/my'),
  getById: (id) => api.get(`/service-requests/${id}`),
  create: (data) => api.post('/service-requests', data),
  assign: (id, assigned_to) => api.patch(`/service-requests/${id}/assign`, { assigned_to }),
  updateStatus: (id, status, extra = {}) => api.patch(`/service-requests/${id}/status`, { status, ...extra }),
};
