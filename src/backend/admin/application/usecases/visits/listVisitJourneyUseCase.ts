import { createAdminError } from '../../errors.js';
import { VisitJourney, type VisitEvent } from '../../../domain/visit.js';
import type { IVisitRepository } from '../../ports/IVisitRepository.js';

export async function listVisitJourneyUseCase(
  repository: IVisitRepository,
  sessionHash: string
): Promise<{ events: VisitEvent[] }> {
  if (!sessionHash) {
    throw createAdminError(400, 'missing_session_hash', 'Session hash is required');
  }

  return new VisitJourney(await repository.listJourney(sessionHash)).toResponse();
}
