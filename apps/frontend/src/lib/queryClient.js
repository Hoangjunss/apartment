// src/lib/queryClient.js
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 30, // 30 giây
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
