import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios.js';

export const ATTACHMENT_KEYS = {
  all: ['attachments'],
  list: (entityType, entityId) => [...ATTACHMENT_KEYS.all, entityType, entityId],
};

export const useAttachments = (entityType, entityId) =>
  useQuery({
    queryKey: ATTACHMENT_KEYS.list(entityType, entityId),
    queryFn: () =>
      api
        .get('/attachments', { params: { entity_type: entityType, entity_id: entityId } })
        .then((r) => r.data.data),
    enabled: !!entityType && !!entityId,
  });

export const useUploadAttachment = (options = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData) =>
      api.post('/attachments/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }),
    onSuccess: (res) => {
      const att = res.data.data;
      qc.invalidateQueries({
        queryKey: ATTACHMENT_KEYS.list(att.entity_type, att.entity_id),
      });
      options.onSuccess?.(res);
    },
    onError: options.onError,
  });
};

export const useDeleteAttachment = (options = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => api.delete(`/attachments/${id}`),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ATTACHMENT_KEYS.all });
      options.onSuccess?.(res);
    },
    onError: options.onError,
  });
};
