import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchOutreachRecords,
  fetchOutreachSummary,
  fetchOutreachChart,
  updateOutreachRecord,
  importOutreachCsv,
  exportOutreachCsv,
} from '../apis/outreachApi';

export function useOutreachRecords(query) {
  return useQuery({
    queryKey: ['admin', 'outreach', 'records', query],
    queryFn: () => fetchOutreachRecords(query),
  });
}

export function useOutreachSummary() {
  return useQuery({
    queryKey: ['admin', 'outreach', 'summary'],
    queryFn: () => fetchOutreachSummary(),
  });
}

export function useOutreachChart(range) {
  return useQuery({
    queryKey: ['admin', 'outreach', 'chart', range],
    queryFn: () => fetchOutreachChart(range),
  });
}

export function useUpdateOutreachRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, changes }) => updateOutreachRecord(id, changes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'outreach'] });
    },
  });
}

export function useImportOutreachCsv() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: importOutreachCsv,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'outreach'] });
    },
  });
}

export function useExportOutreachCsv() {
  return useMutation({
    mutationFn: exportOutreachCsv,
  });
}
