import type { Outreach } from '../../domain/outreach.js';

export interface IOutreachCsvParser {
  parse(csv: string): Record<string, string>[];
  stringify(records: Outreach[]): string;
}
