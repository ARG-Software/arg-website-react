import type { ILogger } from '../../../../shared/logger/ilogger.js';
import type { VisitSessionListResult } from '../../../domain/types/visitsession.types.js';
import type { IVisitRepository } from '../../ports/repositories/ivisit.repository.js';
import { getPagination } from '../pagination.js';

export interface ListAllVisitSessionsInput {
  page?: string | number;
  pageSize?: string | number;
}

export class ListAllVisitSessionsUseCase {
  constructor(private readonly repository: IVisitRepository, private readonly logger?: ILogger) {}

  async execute(input: ListAllVisitSessionsInput = {}): Promise<VisitSessionListResult> {
    const pagination = getPagination(input);
    this.logger?.info('All visit sessions list use case started', pagination);
    const result = await this.repository.listAllSessions(pagination);
    this.logger?.info('All visit sessions list use case completed', {
      recordCount: result.records?.length || 0,
      totalRecords: result.pagination.totalRecords,
    });

    return {
      records: result.records || [],
      pagination: result.pagination,
    };
  }
}
