import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios.js';

export const COMMENT_KEYS = {
  all: ['comments'],
  byRequest: (requestId) => [...COMMENT_KEYS.all, requestId],
};

export const useComments = (serviceRequestId) =>
  useQuery({
    queryKey: COMMENT_KEYS.byRequest(serviceRequestId),
    queryFn: () => api.get(`/comments/${serviceRequestId}`).then((r) => r.data.data),
    enabled: !!serviceRequestId,
  });

export const useCreateComment = (options = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/comments', data),
    onSuccess: (res) => {
      const comment = res.data.data;
      qc.invalidateQueries({ queryKey: COMMENT_KEYS.byRequest(comment.service_request_id) });
      options.onSuccess?.(res);
    },
    onError: options.onError,
  });
};
