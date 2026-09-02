import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteOutreachRecord,
  exportOutreachCsv,
  fetchOutreachChart,
  fetchOutreachRecord,
  fetchOutreachRecords,
  fetchOutreachSummary,
  importOutreachCsv,
  updateOutreachRecord,
} from '../../apis/outreachApi.js';

export const outreachQueryKey = ['admin', 'outreach'];

export function useOutreachRecords(query, options = {}) {
  return useQuery({
    queryKey: [...outreachQueryKey, 'records', query],
    queryFn: () => fetchOutreachRecords(query),
    placeholderData: options.keepPrevious ? keepPreviousData : undefined,
  });
}

export function useOutreachSummary() {
  return useQuery({
    queryKey: [...outreachQueryKey, 'summary'],
    queryFn: () => fetchOutreachSummary(),
  });
}

export function useOutreachChart(range) {
  return useQuery({
    queryKey: [...outreachQueryKey, 'chart', range],
    queryFn: () => fetchOutreachChart(range),
  });
}

export function useOutreachRecord(id, options = {}) {
  return useQuery({
    queryKey: [...outreachQueryKey, 'record', id],
    queryFn: () => fetchOutreachRecord(id),
    enabled: options.enabled ?? Boolean(id),
  });
}

export function useUpdateOutreachRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: outreachQueryKey,
    mutationFn: ({ id, record }) => updateOutreachRecord(id, record),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outreachQueryKey });
    },
  });
}

export function useDeleteOutreachRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: outreachQueryKey,
    mutationFn: deleteOutreachRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outreachQueryKey });
    },
  });
}

export function useImportOutreachCsv() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: outreachQueryKey,
    mutationFn: importOutreachCsv,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outreachQueryKey });
    },
  });
}

export function useExportOutreachCsv() {
  return useMutation({
    mutationKey: outreachQueryKey,
    mutationFn: exportOutreachCsv,
  });
}
