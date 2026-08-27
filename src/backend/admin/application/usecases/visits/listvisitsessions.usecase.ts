import type { VisitSessionListResult } from '../../../domain/types/visit.types.js';
import type { IVisitRepository } from '../../ports/repositories/ivisit.repository.js';
import { getPagination } from '../pagination.js';

export interface ListVisitSessionsInput {
  page?: string | number;
  pageSize?: string | number;
}

export class ListVisitSessionsUseCase {
  constructor(private readonly repository: IVisitRepository) {}

  async execute(input: ListVisitSessionsInput = {}): Promise<VisitSessionListResult> {
    const result = await this.repository.listSessions(getPagination(input));

    return {
      records: result.records || [],
      pagination: result.pagination,
    };
  }
}
