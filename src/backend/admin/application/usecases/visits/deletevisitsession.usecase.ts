import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { createAdminError } from '../../errors.js';
import type { IVisitSessionRepository } from '../../ports/repositories/ivisitsession.repository.js';

export interface DeleteVisitSessionInput {
  // One session hash, or several separated by commas.
  sessionHash?: string;
}

export class DeleteVisitSessionUseCase {
  constructor(private readonly repository: IVisitSessionRepository, private readonly logger?: ILogger) {}

  async execute(input: DeleteVisitSessionInput = {}): Promise<void> {
    const sessionHashes = (input.sessionHash || '').split(',').filter(Boolean);

    if (!sessionHashes.length) {
      this.logger?.warn('Visit session delete rejected', { reason: 'missing_session_hash' });
      throw createAdminError(400, 'missing_session_hash', 'Session hash is required');
    }

    this.logger?.info('Visit session delete started', { sessionCount: sessionHashes.length });
    await this.repository.deleteByIds(sessionHashes);
    this.logger?.info('Visit session delete completed', { sessionCount: sessionHashes.length });
  }
}
