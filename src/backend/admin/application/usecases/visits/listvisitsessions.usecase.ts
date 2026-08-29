import type { ILogger } from '../../../../shared/logger/ilogger.js';
import type { VisitSessionListResult } from '../../../domain/types/visitsession.types.js';
import type { IVisitRepository } from '../../ports/repositories/ivisit.repository.js';
import { getPagination } from '../pagination.js';

export interface ListVisitSessionsInput {
  page?: string | number;
  pageSize?: string | number;
}

export class ListVisitSessionsUseCase {
  constructor(private readonly repository: IVisitRepository, private readonly logger?: ILogger) {}

  async execute(input: ListVisitSessionsInput = {}): Promise<VisitSessionListResult> {
    const pagination = getPagination(input);
    this.logger?.info('Recent visit sessions list use case started', pagination);
    const result = await this.repository.listSessions(pagination);
    this.logger?.info('Recent visit sessions list use case completed', {
      recordCount: result.records?.length || 0,
      totalRecords: result.pagination.totalRecords,
    });

    return {
      records: result.records || [],
      pagination: result.pagination,
    };
  }
}
