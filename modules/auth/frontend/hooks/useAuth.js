// modules/auth/frontend/hooks/useAuth.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/queryKeys.js';
import * as authApi from '../services/auth.api.js';

export function useUsers(params = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.users(params),
    queryFn: () => authApi.getUsers(params),
  });
}

export function useCreateUser(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.createUser,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users({}) });
      options.onSuccess?.(data);
    },
    onError: options.onError,
  });
}

export function useUpdateUser(id, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => authApi.updateUser(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users({}) });
      options.onSuccess?.(data);
    },
    onError: options.onError,
  });
}

export function useToggleUserActive(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.toggleUserActive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users({}) });
      options.onSuccess?.();
    },
    onError: options.onError,
  });
}

export function useChangePassword(options = {}) {
  return useMutation({
    mutationFn: ({ oldPassword, newPassword }) =>
      authApi.changePassword(oldPassword, newPassword),
    onSuccess: options.onSuccess,
    onError: options.onError,
  });
}
