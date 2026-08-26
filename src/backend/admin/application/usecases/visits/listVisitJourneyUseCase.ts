import { createAdminError } from '../../errors.js';
import type { VisitJourneyEvent } from '../../../domain/types/VisitTypes.js';
import type { IVisitRepository } from '../../ports/repositories/IVisitRepository.js';

export interface ListVisitJourneyInput {
  sessionHash?: string;
}

export class ListVisitJourneyUseCase {
  constructor(private readonly repository: IVisitRepository) {}

  async execute(input: ListVisitJourneyInput = {}): Promise<{ events: VisitJourneyEvent[] }> {
    const sessionHash = input.sessionHash || '';

    if (!sessionHash) {
      throw createAdminError(400, 'missing_session_hash', 'Session hash is required');
    }

    return {
      events: await this.repository.listJourney(sessionHash),
    };
  }
}
