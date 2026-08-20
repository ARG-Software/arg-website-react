import { QueryClient } from '@tanstack/react-query';

export const adminQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      retry: 3,
    },
  },
});
