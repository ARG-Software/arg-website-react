import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

const MAX_QUERY_RETRIES = 3;

export const adminQueryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleAdminAuthError,
  }),
  mutationCache: new MutationCache({
    onError: handleAdminAuthError,
  }),
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      retry: shouldRetryAdminRequest,
    },
    mutations: {
      retry: shouldRetryAdminRequest,
    },
  },
});

function shouldRetryAdminRequest(failureCount, error) {
  return error?.status !== 401 && failureCount < MAX_QUERY_RETRIES;
}

function handleAdminAuthError(error) {
  if (error?.status === 401) {
    redirectToAdminLogin();
  }
}

function redirectToAdminLogin() {
  if (typeof window === 'undefined' || window.location.pathname.startsWith('/admin/login')) {
    return;
  }

  const from = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
  adminQueryClient.clear();
  window.location.assign(`/admin/login?from=${from}`);
}
