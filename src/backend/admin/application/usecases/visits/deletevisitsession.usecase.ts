import { createAdminError } from '../../errors.js';
import type { IVisitRepository } from '../../ports/repositories/ivisit.repository.js';

export interface DeleteVisitSessionInput {
  sessionHash?: string;
}

export class DeleteVisitSessionUseCase {
  constructor(private readonly repository: IVisitRepository) {}

  async execute(input: DeleteVisitSessionInput = {}): Promise<void> {
    const sessionHash = input.sessionHash || '';

    if (!sessionHash) {
      throw createAdminError(400, 'missing_session_hash', 'Session hash is required');
    }

    await this.repository.deleteById(sessionHash);
  }
}
