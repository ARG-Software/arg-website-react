import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { OutreachDomainError } from '../../../domain/errors/outreachdomain.error.js';
import type { IOutreachRepository } from '../../ports/repositories/ioutreach.repository.js';

export interface DeleteOutreachRecordInput {
  // One record id, or several separated by commas.
  id?: string;
}

export class DeleteOutreachRecordUseCase {
  constructor(private readonly outreachRepository: IOutreachRepository, private readonly logger?: ILogger) {}

  async execute(input: DeleteOutreachRecordInput = {}): Promise<void> {
    const ids = String(input.id || '')
      .split(',')
      .map(id => id.trim())
      .filter(Boolean);

    if (!ids.length) {
      this.logger?.warn('Outreach record delete rejected', { reason: 'missing_id' });
      throw OutreachDomainError.missingId();
    }

    this.logger?.info('Outreach record delete started', { recordCount: ids.length });
    await this.outreachRepository.deleteByIds(ids);
    this.logger?.info('Outreach record delete completed', { recordCount: ids.length });
  }
}
