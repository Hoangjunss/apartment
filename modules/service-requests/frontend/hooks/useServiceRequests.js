import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serviceRequestApi } from '../services/serviceRequestApi.js';

export const SR_KEYS = {
  all: ['service-requests'],
  lists: () => [...SR_KEYS.all, 'list'],
  list: (params) => [...SR_KEYS.lists(), params],
  my: () => [...SR_KEYS.all, 'my'],
  detail: (id) => [...SR_KEYS.all, 'detail', id],
};

export const useServiceRequests = (params) =>
  useQuery({
    queryKey: SR_KEYS.list(params),
    queryFn: () => serviceRequestApi.getAll(params).then(r => r.data.data),
  });

export const useMyServiceRequests = () =>
  useQuery({
    queryKey: SR_KEYS.my(),
    queryFn: () => serviceRequestApi.getMy().then(r => r.data.data),
  });

export const useServiceRequestById = (id) =>
  useQuery({
    queryKey: SR_KEYS.detail(id),
    queryFn: () => serviceRequestApi.getById(id).then(r => r.data.data),
    enabled: !!id,
  });

export const useCreateServiceRequest = (options = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => serviceRequestApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SR_KEYS.all });
      options.onSuccess?.();
    },
    onError: options.onError,
  });
};

export const useAssignServiceRequest = (options = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assigned_to }) => serviceRequestApi.assign(id, assigned_to),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SR_KEYS.all });
      options.onSuccess?.();
    },
    onError: options.onError,
  });
};

export const useUpdateServiceRequestStatus = (options = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, expenses }) => serviceRequestApi.updateStatus(id, status, { expenses }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SR_KEYS.all });
      options.onSuccess?.();
    },
    onError: options.onError,
  });
};
