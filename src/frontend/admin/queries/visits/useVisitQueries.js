import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteVisitSessions,
  fetchAllVisitSessions,
  fetchVisitBreakdown,
  fetchVisitChart,
  fetchVisitCountryBreakdown,
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

export function useVisitBreakdown(metric, range, query = {}, options = {}) {
  return useQuery({
    queryKey: [...visitQueryKey, 'breakdown', metric, range, query],
    queryFn: () => fetchVisitBreakdown(metric, range, query),
    placeholderData: options.keepPrevious ? keepPreviousData : undefined,
  });
}

export function useVisitCountryBreakdown(range, query = {}, options = {}) {
  return useQuery({
    queryKey: [...visitQueryKey, 'countryBreakdown', range, query],
    queryFn: () => fetchVisitCountryBreakdown(range, query),
    placeholderData: options.keepPrevious ? keepPreviousData : undefined,
  });
}

export function useVisitSessions(query, options = {}) {
  return useQuery({
    queryKey: [...visitQueryKey, 'sessions', query],
    queryFn: () => fetchVisitSessions(query),
    placeholderData: options.keepPrevious ? keepPreviousData : undefined,
  });
}

export function useAllVisitSessions(query, options = {}) {
  return useQuery({
    queryKey: [...visitQueryKey, 'allSessions', query],
    queryFn: () => fetchAllVisitSessions(query),
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

export function useDeleteVisitSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: visitQueryKey,
    mutationFn: deleteVisitSessions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitQueryKey });
    },
  });
}
