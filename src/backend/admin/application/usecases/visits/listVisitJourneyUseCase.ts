import { createAdminError } from '../../errors.js';
import type { VisitEvent } from '../../../domain/types/VisitTypes.js';
import type { IVisitRepository } from '../../ports/repositories/IVisitRepository.js';

export async function listVisitJourneyUseCase(
  repository: IVisitRepository,
  sessionHash: string
): Promise<{ events: VisitEvent[] }> {
  if (!sessionHash) {
    throw createAdminError(400, 'missing_session_hash', 'Session hash is required');
  }

  return {
    events: await repository.listJourney(sessionHash),
  };
}
