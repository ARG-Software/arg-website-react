import { Outreach } from '../../../domain/outreach.js';
import type { IOutreachCsvParser } from '../../ports/IOutreachCsvParser.js';

export function createOutreachCsvUseCase(
  records: Outreach[],
  { csvParser }: { csvParser: IOutreachCsvParser }
): string {
  return csvParser.stringify(records);
}
