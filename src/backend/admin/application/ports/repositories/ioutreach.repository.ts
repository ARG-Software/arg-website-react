import type { Outreach } from '../../../domain/outreach.js';
import type { OutreachStatus, OutreachSummary } from '../../../domain/types/outreach.types.js';

export type OutreachRecordSortField = 'companyName' | 'createdAt' | 'dateSent' | 'followUpDate';

export interface OutreachRecordListQuery {
  page: number;
  pageSize: number;
  status?: OutreachStatus;
  companyName?: string;
  dateSentFrom?: string;
  dateSentTo?: string;
  sortBy: OutreachRecordSortField;
  sortDirection: 'asc' | 'desc';
  recentSent: boolean;
}

export interface OutreachRecordListResult {
  records: Outreach[];
  pagination: {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
  };
}

export interface OutreachChartRecord {
  createdAt?: string;
  updatedAt?: string;
  dateSent: string;
  replyObtained: boolean;
}

export interface IOutreachRepository {
  list(): Promise<Outreach[]>;
  listRecords(query: OutreachRecordListQuery): Promise<OutreachRecordListResult>;
  getSummary(): Promise<OutreachSummary>;
  listChartRecords(input?: { dateSentFrom?: string }): Promise<OutreachChartRecord[]>;
  findById(id: string): Promise<Outreach | null>;
  save(outreach: Outreach): Promise<Outreach>;
  createMany(outreaches: Outreach[]): Promise<Outreach[]>;
}

export interface IOutreachAuditRepository {
  recordUpdated(input: {
    actorEmail: string;
    changedFields: string[];
    recordId: string;
  }): Promise<void>;
}
