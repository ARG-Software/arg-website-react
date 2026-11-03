import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchAdminArchitectReleases,
  syncAdminArchitectReleases,
} from '../../apis/architectReleasesApi.js';

export const architectReleaseQueryKey = ['admin', 'architectReleases'];

export function useAdminArchitectReleases(query, options = {}) {
  return useQuery({
    queryKey: [...architectReleaseQueryKey, 'records', query],
    queryFn: () => fetchAdminArchitectReleases(query),
    placeholderData: options.keepPrevious ? keepPreviousData : undefined,
  });
}

export function useSyncAdminArchitectReleases() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: architectReleaseQueryKey,
    mutationFn: syncAdminArchitectReleases,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: architectReleaseQueryKey });
    },
  });
}
