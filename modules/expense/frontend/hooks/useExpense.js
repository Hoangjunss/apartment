import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as expenseApi from '../services/expense.api.js';

export function useExpenses(params = {}) {
  return useQuery({
    queryKey: ['expenses', params],
    queryFn: () => expenseApi.getExpenses(params),
    placeholderData: (prev) => prev,
  });
}

export function useExpensesSummary(params = {}) {
  return useQuery({
    queryKey: ['expensesSummary', params],
    queryFn: () => expenseApi.getExpensesSummary(params),
  });
}

export function useCreateExpense(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: expenseApi.createExpense,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expensesSummary'] });
      options.onSuccess?.(data);
    },
    onError: options.onError,
  });
}

export function useUpdateExpense(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: expenseApi.updateExpense,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expensesSummary'] });
      options.onSuccess?.(data);
    },
    onError: options.onError,
  });
}

export function useUpdateExpenseStatus(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: expenseApi.updateExpenseStatus,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expensesSummary'] });
      options.onSuccess?.(data);
    },
    onError: options.onError,
  });
}

export function useDeleteExpense(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: expenseApi.deleteExpense,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expensesSummary'] });
      options.onSuccess?.(data);
    },
    onError: options.onError,
  });
}
