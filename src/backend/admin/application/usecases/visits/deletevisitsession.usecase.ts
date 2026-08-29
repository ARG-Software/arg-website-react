import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { createAdminError } from '../../errors.js';
import type { IVisitRepository } from '../../ports/repositories/ivisit.repository.js';

export interface DeleteVisitSessionInput {
  sessionHash?: string;
}

export class DeleteVisitSessionUseCase {
  constructor(private readonly repository: IVisitRepository, private readonly logger?: ILogger) {}

  async execute(input: DeleteVisitSessionInput = {}): Promise<void> {
    const sessionHash = input.sessionHash || '';

    if (!sessionHash) {
      this.logger?.warn('Visit session delete rejected', { reason: 'missing_session_hash' });
      throw createAdminError(400, 'missing_session_hash', 'Session hash is required');
    }

    this.logger?.info('Visit session delete started', { sessionHash });
    await this.repository.deleteById(sessionHash);
    this.logger?.info('Visit session delete completed', { sessionHash });
  }
}
