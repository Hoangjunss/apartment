import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios.js';

export const useGlobalSearch = (query) => {
  const trimmed = query?.trim() ?? '';
  return useQuery({
    queryKey: ['global-search', trimmed],
    queryFn: () =>
      api.get('/search', { params: { q: trimmed } }).then((res) => res.data.data),
    enabled: trimmed.length >= 2,
    staleTime: 5000, // Cache results for 5s
  });
};
