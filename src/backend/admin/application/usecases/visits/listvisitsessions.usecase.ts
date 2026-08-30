import type { ILogger } from '../../../../shared/logger/ilogger.js';
import type {
  VisitSessionListQuery,
  VisitSessionListResult,
  VisitSessionSortField,
} from '../../../domain/types/visitsession.types.js';
import type { IVisitSessionRepository } from '../../ports/repositories/ivisitsession.repository.js';
import { createPagination, getPagination } from '../pagination.js';

const SORT_FIELDS = new Set(['entryPath', 'pageCount', 'eventCount', 'durationMs', 'lastSeenAt']);

export interface ListVisitSessionsInput {
  page?: string | number;
  pageSize?: string | number;
  sortBy?: string;
  sortDirection?: string;
}

export class ListVisitSessionsUseCase {
  constructor(private readonly repository: IVisitSessionRepository, private readonly logger?: ILogger) {}

  async execute(input: ListVisitSessionsInput = {}): Promise<VisitSessionListResult> {
    const query = getVisitSessionQuery(input);
    this.logger?.info('Recent visit sessions list use case started', query);
    const result = await this.repository.findMany({ ...query, recentSince: getRecentVisitsCutoff() });
    this.logger?.info('Recent visit sessions list use case completed', {
      recordCount: result.records?.length || 0,
      totalRecords: result.totalRecords,
    });

    return {
      records: result.records || [],
      pagination: createPagination(query.page, query.pageSize, result.totalRecords),
    };
  }
}

function getRecentVisitsCutoff(): string {
  const cutoff = new Date();
  cutoff.setUTCHours(0, 0, 0, 0);
  cutoff.setUTCDate(cutoff.getUTCDate() - 1);

  return cutoff.toISOString();
}

function getVisitSessionQuery(input: ListVisitSessionsInput): VisitSessionListQuery {
  return {
    ...getPagination(input),
    sortBy: (SORT_FIELDS.has(input.sortBy || '') ? input.sortBy : 'lastSeenAt') as VisitSessionSortField,
    sortDirection: String(input.sortDirection || '').toLowerCase() === 'asc' ? 'asc' : 'desc',
  };
}
