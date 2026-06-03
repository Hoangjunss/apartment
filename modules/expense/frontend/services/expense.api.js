import { api } from '@/lib/axios.js';

export async function getExpenses(params = {}) {
  const res = await api.get('/expense', { params });
  return res.data.data;
}

export async function getExpensesSummary(params = {}) {
  const res = await api.get('/expense/summary', { params });
  return res.data.data;
}

export async function createExpense(data) {
  const res = await api.post('/expense', data);
  return res.data.data;
}

export async function updateExpense({ id, ...data }) {
  const res = await api.put(`/expense/${id}`, data);
  return res.data.data;
}

export async function updateExpenseStatus({ id, status }) {
  const res = await api.patch(`/expense/${id}/status`, { status });
  return res.data.data;
}

export async function deleteExpense(id) {
  const res = await api.delete(`/expense/${id}`);
  return res.data.data;
}
