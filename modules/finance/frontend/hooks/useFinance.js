import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/queryKeys.js';
import * as financeApi from '../services/finance.api.js';

export function useUtilities(params = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.utilities(params),
    queryFn: () => financeApi.getUtilities(params),
    placeholderData: (prev) => prev,
  });
}

export function useRecordUtility(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: financeApi.recordUtility,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.utilities({}) });
      options.onSuccess?.(data);
    },
    onError: options.onError,
  });
}

export function useInvoices(params = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.invoices(params),
    queryFn: () => financeApi.getInvoices(params),
    placeholderData: (prev) => prev,
  });
}

export function useInvoiceById(id) {
  return useQuery({
    queryKey: QUERY_KEYS.invoice(id),
    queryFn: () => financeApi.getInvoiceById(id),
    enabled: !!id,
  });
}

export function useGenerateInvoice(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: financeApi.generateInvoice,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoices({}) });
      options.onSuccess?.(data);
    },
    onError: options.onError,
  });
}

export function useUpdateInvoiceStatus(id, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status) => financeApi.updateInvoiceStatus(id, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoice(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoices({}) });
      options.onSuccess?.(data);
    },
    onError: options.onError,
  });
}

export function useRecordPayment(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: financeApi.recordPayment,
    onSuccess: (data) => {
      if (data && data.invoice_id) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoice(data.invoice_id) });
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoices({}) });
      options.onSuccess?.(data);
    },
    onError: options.onError,
  });
}
