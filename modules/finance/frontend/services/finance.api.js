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
