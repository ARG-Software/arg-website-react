import { Outreach, OutreachCsv } from '../../../domain/outreach.js';

export function createOutreachCsvUseCase(records: Outreach[]): string {
  return new OutreachCsv(records).toCsv();
}
