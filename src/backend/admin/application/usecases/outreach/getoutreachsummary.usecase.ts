import { Outreach } from '../../../domain/outreach.js';
import type { IOutreachRepository } from '../../ports/repositories/ioutreach.repository.js';

export class GetOutreachSummaryUseCase {
  constructor(private readonly outreachRepository: IOutreachRepository) {}

  async execute() {
    return { summary: Outreach.createSummary(await this.outreachRepository.list()) };
  }
}
