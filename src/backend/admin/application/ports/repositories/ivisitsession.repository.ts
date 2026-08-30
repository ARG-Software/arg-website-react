import type {
  VisitSessionListItem,
  VisitSessionListQuery,
} from '../../../domain/types/visitsession.types.js';

export type VisitSessionFindManyQuery = VisitSessionListQuery & {
  recentSince?: string | null;
};

export type VisitSessionFindManyResult = {
  records: VisitSessionListItem[];
  totalRecords: number;
};

export type VisitMetricSessionRecord = {
  sessionHash: string;
  countryCode: string | null;
  referrer: string | null;
  source: string | null;
  campaign: string | null;
  clickId: string | null;
};

export type VisitJourneySessionRecord = {
  sessionHash: string;
  referrer: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
};

export interface IVisitSessionRepository {
  findMany(query?: VisitSessionFindManyQuery): Promise<VisitSessionFindManyResult>;
  findMetricsByHashes(sessionHashes: string[]): Promise<VisitMetricSessionRecord[]>;
  findJourneyByHash(sessionHash: string): Promise<VisitJourneySessionRecord>;
  deleteById(sessionHash: string): Promise<void>;
  deleteOlderThan(cutoffIso: string): Promise<{ events: number; sessions: number }>;
}
