import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { createAdminError } from '../../errors.js';
import type { VisitJourneyEvent } from '../../../domain/types/visitevents.types.js';
import type { IVisitRepository } from '../../ports/repositories/ivisit.repository.js';

export interface ListVisitJourneyInput {
  sessionHash?: string;
}

export class ListVisitJourneyUseCase {
  constructor(private readonly repository: IVisitRepository, private readonly logger?: ILogger) {}

  async execute(input: ListVisitJourneyInput = {}): Promise<{ events: VisitJourneyEvent[] }> {
    const sessionHash = input.sessionHash || '';

    if (!sessionHash) {
      this.logger?.warn('Visit journey lookup rejected', { reason: 'missing_session_hash' });
      throw createAdminError(400, 'missing_session_hash', 'Session hash is required');
    }

    this.logger?.info('Visit journey lookup started', { sessionHash });
    const events = await this.repository.listJourney(sessionHash);
    this.logger?.info('Visit journey lookup completed', { sessionHash, eventCount: events.length });

    return {
      events,
    };
  }
}
