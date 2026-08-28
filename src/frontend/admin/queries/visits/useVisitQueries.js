import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteVisitSession,
  fetchVisitBreakdown,
  fetchVisitChart,
  fetchVisitJourney,
  fetchVisitSessions,
  fetchVisitStat,
} from '../../apis/visitMetricsApi.js';

export const visitQueryKey = ['admin', 'visits'];

export function useVisitStat(metric, range) {
  return useQuery({
    queryKey: [...visitQueryKey, 'stat', metric, range],
    queryFn: () => fetchVisitStat(metric, range),
  });
}

export function useVisitChart(range, series) {
  return useQuery({
    queryKey: [...visitQueryKey, 'chart', range, series],
    queryFn: () => fetchVisitChart(range, series),
  });
}

export function useVisitBreakdown(metric, range) {
  return useQuery({
    queryKey: [...visitQueryKey, 'breakdown', metric, range],
    queryFn: () => fetchVisitBreakdown(metric, range),
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
