// modules/tenant/frontend/hooks/useTenant.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/queryKeys.js';
import * as tenantApi from '../services/tenant.api.js';

export function useTenants(params = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.tenants(params),
    queryFn: () => tenantApi.getTenants(params),
    placeholderData: (prev) => prev,
  });
}

export function useTenantById(id) {
  return useQuery({
    queryKey: QUERY_KEYS.tenant(id),
    queryFn: () => tenantApi.getTenantById(id),
    enabled: !!id,
  });
}

export function useTenantHistory(id) {
  return useQuery({
    queryKey: QUERY_KEYS.tenantHistory(id),
    queryFn: () => tenantApi.getTenantHistory(id),
    enabled: !!id,
  });
}

export function useCreateTenant(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tenantApi.createTenant,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenants({}) });
      options.onSuccess?.(data);
    },
    onError: options.onError,
  });
}

export function useUpdateTenant(id, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => tenantApi.updateTenant(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenant(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenants({}) });
      options.onSuccess?.(data);
    },
    onError: options.onError,
  });
}

export function useRegistrationsByTenant(tenantId) {
  return useQuery({
    queryKey: QUERY_KEYS.registrations(tenantId),
    queryFn: () => tenantApi.getRegistrationsByTenant(tenantId),
    enabled: !!tenantId,
  });
}

export function useCreateRegistration(tenantId, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => tenantApi.createRegistration(tenantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.registrations(tenantId) });
      options.onSuccess?.();
    },
    onError: options.onError,
  });
}
