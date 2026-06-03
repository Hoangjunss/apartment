import { api } from '@/lib/axios.js';

export async function getUtilities(params = {}) {
  const res = await api.get('/finance/utilities', { params });
  return res.data.data;
}

export async function recordUtility(data) {
  const res = await api.post('/finance/utilities', data);
  return res.data.data;
}

export async function getInvoices(params = {}) {
  const res = await api.get('/finance/invoices', { params });
  return res.data.data;
}

export async function getInvoiceById(id) {
  const res = await api.get(`/finance/invoices/${id}`);
  return res.data.data;
}

export async function generateInvoice(data) {
  const res = await api.post('/finance/invoices/generate', data);
  return res.data.data;
}

export async function updateInvoiceStatus(id, status) {
  const res = await api.patch(`/finance/invoices/${id}/status`, { status });
  return res.data.data;
}

export async function recordPayment(data) {
  const res = await api.post('/finance/payments', data);
  return res.data.data;
}

export async function bulkImportUtilities(formData) {
  const res = await api.post('/finance/utilities/bulk-import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data.data;
}

export async function downloadUtilityTemplate() {
  const res = await api.get('/finance/utilities/template', {
    responseType: 'blob',
  });
  return res.data;
}

export async function importUtilityPreview(formData) {
  const res = await api.post('/finance/utilities/import-preview', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data.data;
}

export async function bulkSaveUtilities(readings) {
  const res = await api.post('/finance/utilities/bulk-save', { readings });
  return res.data.data;
}
