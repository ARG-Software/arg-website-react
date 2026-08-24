import type { VisitSessionListResult } from '../../../domain/types/VisitTypes.js';
import type { IVisitRepository } from '../../ports/repositories/IVisitRepository.js';

export async function listVisitSessionsUseCase(
  repository: IVisitRepository,
  pagination: { page?: number; pageSize?: number }
): Promise<VisitSessionListResult> {
  const result = await repository.listSessions(pagination);

  return {
    records: result.records || [],
    pagination: result.pagination,
  };
}
