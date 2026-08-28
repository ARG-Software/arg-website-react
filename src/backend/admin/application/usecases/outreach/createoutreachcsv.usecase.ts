import type { IOutreachCsvParser } from '../../ports/ioutreachcsv.parser.js';
import type { IOutreachRepository } from '../../ports/repositories/ioutreach.repository.js';

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
