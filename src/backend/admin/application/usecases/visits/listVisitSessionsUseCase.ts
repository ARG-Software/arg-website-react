import { VisitSessions, type VisitSessionListResult } from '../../../domain/visit.js';
import type { IVisitRepository } from '../../ports/IVisitRepository.js';

export async function listVisitSessionsUseCase(
  repository: IVisitRepository,
  pagination: { page?: number; pageSize?: number }
): Promise<VisitSessionListResult> {
  return new VisitSessions(await repository.listSessions(pagination)).toResponse();
}
