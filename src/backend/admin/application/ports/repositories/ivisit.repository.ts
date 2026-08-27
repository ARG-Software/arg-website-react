import type {
  VisitJourneyEvent,
  VisitMetricsData,
  VisitSessionListResult,
  VisitSessionRecord,
} from '../../../domain/types/visit.types.js';

export interface IVisitRepository {
  recordSession(record: VisitSessionRecord): Promise<void>;
  getMetrics(range?: string): Promise<VisitMetricsData>;
  listSessions(pagination?: { page?: number; pageSize?: number }): Promise<VisitSessionListResult>;
  listJourney(sessionHash: string): Promise<VisitJourneyEvent[]>;
  deleteOlderThan(cutoffIso: string): Promise<{ events: number; sessions: number }>;
}
