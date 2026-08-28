import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteVisitSession,
  fetchVisitJourney,
  fetchVisitMetrics,
  fetchVisitSessions,
} from '../../apis/visitMetricsApi.js';

export const visitQueryKey = ['admin', 'visits'];

export function useVisitMetrics(range) {
  return useQuery({
    queryKey: [...visitQueryKey, 'metrics', range],
    queryFn: () => fetchVisitMetrics(range),
  });
}

export function useVisitSessions(query, options = {}) {
  return useQuery({
    queryKey: [...visitQueryKey, 'sessions', query],
    queryFn: () => fetchVisitSessions(query),
    placeholderData: options.keepPrevious ? keepPreviousData : undefined,
  });
}

export function useVisitJourney(sessionHash) {
  return useQuery({
    queryKey: [...visitQueryKey, 'journey', sessionHash],
    queryFn: () => fetchVisitJourney(sessionHash),
    enabled: Boolean(sessionHash),
  });
}

export function useDeleteVisitSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: visitQueryKey,
    mutationFn: deleteVisitSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitQueryKey });
    },
  });
}
