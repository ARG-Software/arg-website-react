import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteAssistantConversation,
  fetchAssistantConversation,
  fetchAssistantConversations,
} from '../../apis/assistantConversationsApi.js';

export const assistantQueryKey = ['admin', 'assistantConversations'];

export function useAssistantConversations(query, options = {}) {
  return useQuery({
    queryKey: [...assistantQueryKey, 'records', query],
    queryFn: () => fetchAssistantConversations(query),
    placeholderData: options.keepPrevious ? keepPreviousData : undefined,
  });
}

export function useAssistantConversation(id, options = {}) {
  return useQuery({
    queryKey: [...assistantQueryKey, 'detail', id],
    queryFn: () => fetchAssistantConversation(id),
    enabled: Boolean(id) && options.enabled !== false,
  });
}

export function useDeleteAssistantConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: assistantQueryKey,
    mutationFn: deleteAssistantConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assistantQueryKey });
    },
  });
}
