import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchAssistantConversations,
  fetchAssistantConversation,
  deleteAssistantConversation,
} from '../apis/assistantConversationsApi';

export function useAssistantConversations(query) {
  return useQuery({
    queryKey: ['admin', 'assistantConversations', query],
    queryFn: () => fetchAssistantConversations(query),
  });
}

export function useAssistantConversation(id) {
  return useQuery({
    queryKey: ['admin', 'assistantConversations', id],
    queryFn: () => fetchAssistantConversation(id),
    enabled: !!id,
  });
}

export function useDeleteAssistantConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAssistantConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'assistantConversations'] });
    },
  });
}
