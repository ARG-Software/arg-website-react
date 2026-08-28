import type { VisitSessionListResult } from '../../../domain/types/visitsession.types.js';
import type { IVisitRepository } from '../../ports/repositories/ivisit.repository.js';
import { getPagination } from '../pagination.js';

export interface ListAllVisitSessionsInput {
  page?: string | number;
  pageSize?: string | number;
}

export class ListAllVisitSessionsUseCase {
  constructor(private readonly repository: IVisitRepository) {}

  async execute(input: ListAllVisitSessionsInput = {}): Promise<VisitSessionListResult> {
    const result = await this.repository.listAllSessions(getPagination(input));

    return {
      records: result.records || [],
      pagination: result.pagination,
    };
  }
}
