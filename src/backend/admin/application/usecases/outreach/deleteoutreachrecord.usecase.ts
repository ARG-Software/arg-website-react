import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { OutreachDomainError } from '../../../domain/errors/outreachdomain.error.js';
import type { IOutreachRepository } from '../../ports/repositories/ioutreach.repository.js';

export interface DeleteOutreachRecordInput {
  id?: string;
}

export class DeleteOutreachRecordUseCase {
  constructor(private readonly outreachRepository: IOutreachRepository, private readonly logger?: ILogger) {}

  async execute(input: DeleteOutreachRecordInput = {}): Promise<void> {
    const id = String(input.id || '').trim();

    if (!id) {
      this.logger?.warn('Outreach record delete rejected', { reason: 'missing_id' });
      throw OutreachDomainError.missingId();
    }

    this.logger?.info('Outreach record delete started', { outreachId: id });
    await this.outreachRepository.deleteById(id);
    this.logger?.info('Outreach record delete completed', { outreachId: id });
  }
}
