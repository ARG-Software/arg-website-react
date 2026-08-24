import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

import type { IOutreachCsvParser } from '../../application/ports/IOutreachCsvParser.js';
import type { Outreach } from '../../domain/outreach.js';

const COLUMNS = [
  'companyName',
  'website',
  'contactEmail',
  'contactInfo',
  'contactMethod',
  'fitReason',
  'emailSubject',
  'emailBody',
  'status',
  'dateSent',
  'followUpDate',
  'replyObtained',
  'replySummary',
  'notes',
];

export class OutreachCsvParser implements IOutreachCsvParser {
  parse(csv: string): Record<string, string>[] {
    try {
      return parse(csv || '', {
        bom: true,
        columns: headers => headers.map(normalizeHeader),
        skip_empty_lines: true,
        trim: false,
      });
    } catch (error) {
      throw createCsvError(error);
    }
  }

  stringify(records: Outreach[]): string {
    return stringify(records, {
      columns: COLUMNS,
      header: true,
    });
  }
}

function normalizeHeader(value: string): string {
  const words = String(value || '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .split('_')
    .filter(Boolean);

  if (!words.length) return '';

  return words[0] + words.slice(1).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}

function createCsvError(error: unknown): Error & { code: string } {
  const message = error instanceof Error ? error.message : 'Invalid CSV';
  const csvError = new Error(message) as Error & { code: string };
  csvError.code = 'invalid_csv';

  return csvError;
}
