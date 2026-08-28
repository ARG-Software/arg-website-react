import type {
  VisitBreakdownMetric,
  VisitBreakdownResult,
  VisitChartResult,
  VisitChartSeries,
  VisitMetricRange,
  VisitStatMetric,
  VisitStatResult,
} from '../../../domain/types/visitmetrics.types.js';
import type { VisitJourneyEvent } from '../../../domain/types/visitevents.types.js';
import type {
  VisitSessionListResult,
  VisitSessionRecord,
} from '../../../domain/types/visitsession.types.js';

export interface IVisitRepository {
  recordSession(record: VisitSessionRecord): Promise<void>;
  getStat(metric: VisitStatMetric, range: VisitMetricRange): Promise<VisitStatResult>;
  getChart(range: VisitMetricRange, series: VisitChartSeries): Promise<VisitChartResult>;
  getBreakdown(
    metric: VisitBreakdownMetric,
    range: VisitMetricRange
  ): Promise<VisitBreakdownResult>;
  listSessions(pagination?: { page?: number; pageSize?: number }): Promise<VisitSessionListResult>;
  listJourney(sessionHash: string): Promise<VisitJourneyEvent[]>;
  deleteById(sessionHash: string): Promise<void>;
  deleteOlderThan(cutoffIso: string): Promise<{ events: number; sessions: number }>;
}
