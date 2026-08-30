import type { VisitMetricRangeQuery } from './ivisitpageview.repository.js';

export type VisitMetricEventRecord = {
  sessionHash: string;
  occurredAt: string;
};

export type VisitEventRecord = {
  sessionHash: string;
  name: string;
  params: Record<string, string | number | boolean | null>;
  sequence: string | number;
  path: string;
  occurredAt: string;
};

export interface IVisitEventRepository {
  findForMetricRange(query: VisitMetricRangeQuery): Promise<VisitMetricEventRecord[]>;
  findBySessionHash(sessionHash: string): Promise<VisitEventRecord[]>;
}
