import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAdminSocialPosts, syncAdminSocialPosts } from '../../apis/socialPostsApi.js';

export const socialQueryKey = ['admin', 'socialPosts'];

export function useAdminSocialPosts(query, options = {}) {
  return useQuery({
    queryKey: [...socialQueryKey, 'records', query],
    queryFn: () => fetchAdminSocialPosts(query),
    placeholderData: options.keepPrevious ? keepPreviousData : undefined,
  });
}

export function useSyncAdminSocialPosts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: socialQueryKey,
    mutationFn: syncAdminSocialPosts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialQueryKey });
    },
  });
}
