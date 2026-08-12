import { api } from '@/lib/axios.js';

export async function getRevenueReport(params = {}) {
  const res = await api.get('/report/revenue', { params });
  return res.data.data;
}

export async function getOccupancyReport(params = {}) {
  const res = await api.get('/report/occupancy', { params });
  return res.data.data;
}

export async function getMaintenanceReport(params = {}) {
  const res = await api.get('/report/maintenance', { params });
  return res.data.data;
}

export async function getContractsReport(params = {}) {
  const res = await api.get('/report/contracts', { params });
  return res.data.data;
}

// Download helper for Excel / CSV export
export async function downloadExportFile(endpoint, params = {}) {
  const res = await api.get(endpoint, {
    params,
    responseType: 'blob'
  });
  return res.data;
}

export async function getWeeklyReport() {
  const res = await api.get('/report/weekly');
  return res.data.data;
}

export async function triggerWeeklyReport(userIds = null) {
  const res = await api.post('/report/weekly/trigger', { userIds });
  return res.data;
}

export async function getWeeklyReportCandidates() {
  const res = await api.get('/report/weekly/candidates');
  return res.data.data;
}


