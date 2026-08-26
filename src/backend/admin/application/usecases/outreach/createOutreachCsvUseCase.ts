import type { IOutreachCsvParser } from '../../ports/IOutreachCsvParser.js';
import type { IOutreachRepository } from '../../ports/repositories/IOutreachRepository.js';

export class CreateOutreachCsvUseCase {
  constructor(
    private readonly csvParser: IOutreachCsvParser,
    private readonly outreachRepository: IOutreachRepository
  ) {}

  async execute(): Promise<string> {
    const records = await this.outreachRepository.list();

    return this.csvParser.stringify(records);
  }
}
