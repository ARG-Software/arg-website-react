import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
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
