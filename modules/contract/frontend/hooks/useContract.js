// modules/contract/frontend/hooks/useContract.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/queryKeys.js';
import * as contractApi from '../services/contract.api.js';

export function useContracts(params = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.contracts(params),
    queryFn: () => contractApi.getContracts(params),
    placeholderData: (prev) => prev,
  });
}

export function useContractById(id) {
  return useQuery({
    queryKey: QUERY_KEYS.contract(id),
    queryFn: () => contractApi.getContractById(id),
    enabled: !!id,
  });
}

export function useExpiringSoon() {
  return useQuery({
    queryKey: QUERY_KEYS.expiringSoon,
    queryFn: contractApi.getExpiringSoon,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateContract(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: contractApi.createContract,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contracts({}) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.apartments({}) });
      options.onSuccess?.(data);
    },
    onError: options.onError,
  });
}

export function useUpdateContract(id, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => contractApi.updateContract(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contract(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contracts({}) });
      options.onSuccess?.(data);
    },
    onError: options.onError,
  });
}

export function useTerminateContract(id, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason) => contractApi.terminateContract(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contract(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contracts({}) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.apartments({}) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expiringSoon });
      options.onSuccess?.();
    },
    onError: options.onError,
  });
}

export function useRenewContract(id, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => contractApi.renewContract(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contract(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.renewals(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contracts({}) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expiringSoon });
      options.onSuccess?.();
    },
    onError: options.onError,
  });
}

export function useRenewals(contractId) {
  return useQuery({
    queryKey: QUERY_KEYS.renewals(contractId),
    queryFn: () => contractApi.getRenewals(contractId),
    enabled: !!contractId,
  });
}
