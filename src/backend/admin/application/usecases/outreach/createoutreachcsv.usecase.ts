import type { ILogger } from '../../../../shared/logger/ilogger.js';
import type { IOutreachCsvParser } from '../../ports/ioutreachcsv.parser.js';
import type { IOutreachRepository } from '../../ports/repositories/ioutreach.repository.js';

export class CreateOutreachCsvUseCase {
  constructor(
    private readonly csvParser: IOutreachCsvParser,
    private readonly outreachRepository: IOutreachRepository,
    private readonly logger?: ILogger
  ) {}

  async execute(): Promise<string> {
    this.logger?.info('Outreach CSV export started');
    const records = await this.outreachRepository.list();
    this.logger?.info('Outreach CSV export records loaded', { recordCount: records.length });

    const csv = this.csvParser.stringify(records);
    this.logger?.info('Outreach CSV export completed', { recordCount: records.length });

    return csv;
  }
}
