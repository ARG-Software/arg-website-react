import { OutreachDomainError } from '../../../domain/errors/outreachdomain.error.js';
import type { IOutreachRepository } from '../../ports/repositories/ioutreach.repository.js';

export interface GetOutreachRecordInput {
  id?: string;
}

export class GetOutreachRecordUseCase {
  constructor(private readonly outreachRepository: IOutreachRepository) {}

  async execute(input: GetOutreachRecordInput = {}) {
    const id = String(input.id || '').trim();
    if (!id) throw OutreachDomainError.missingId();

    const record = await this.outreachRepository.findById(id);
    if (!record) throw OutreachDomainError.notFound();

    return { record };
  }
}
