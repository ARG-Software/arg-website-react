import { Outreach } from '../../../domain/outreach.js';
import { OutreachDomainError } from '../../../domain/errors/OutreachDomainError.js';
import type { IClock } from '../../ports/IClock.js';
import type { IOutreachCsvParser } from '../../ports/IOutreachCsvParser.js';
import type { IOutreachRepository } from '../../ports/repositories/IOutreachRepository.js';

const MAX_IMPORT_ROWS = 30;

export interface ImportOutreachCsvInput {
  csv: string;
}

export interface ImportOutreachCsvDependencies {
  clock: IClock;
  csvParser: IOutreachCsvParser;
  outreachRepository: IOutreachRepository;
}

export async function importOutreachCsvUseCase(
  input: ImportOutreachCsvInput,
  { clock, csvParser, outreachRepository }: ImportOutreachCsvDependencies
): Promise<{ imported: number; records?: Outreach[]; errors: { row: number; error: string }[] }> {
  const rows = csvParser.parse(input.csv || '');
  if (rows.length > MAX_IMPORT_ROWS) throw OutreachDomainError.tooManyRows();

  const records: Outreach[] = [];
  const errors: { row: number; error: string }[] = [];
  const today = clock.today();

  rows.forEach((row, index) => {
    try {
      records.push(createOutreach(row, today));
    } catch (error) {
      errors.push({
        row: index + 2,
        error: error instanceof Error ? error.message : 'Invalid row',
      });
    }
  });

  if (errors.length) {
    return { imported: 0, errors };
  }

  try {
    const createdRecords = await outreachRepository.createMany(records);
    return { imported: createdRecords.length, records: createdRecords, errors: [] };
  } catch (error) {
    if (isDuplicateDatabaseError(error)) {
      throw OutreachDomainError.duplicateRecord();
    }

    throw error;
  }
}

function isDuplicateDatabaseError(error: Error): boolean {
  const databaseError = error as Error & { code?: string };

  return databaseError.code === '23505' || /duplicate key/i.test(databaseError.message || '');
}

function createOutreach(row: Record<string, string>, today: string): Outreach {
  const replyObtained = parseBoolean(row.replyObtained);
  const csvStatus = clean(row.status).toLowerCase();
  let status: 'sent' | 'not_sent' = 'not_sent';

  if (replyObtained || csvStatus === 'sent' || csvStatus === 'replied') {
    status = 'sent';
  }

  let contactMethod: 'email' | 'contact_form' = clean(row.contactEmail) ? 'email' : 'contact_form';
  const csvContactMethod = clean(row.contactMethod).toLowerCase().replace(/[\s-]+/g, '_');

  if (csvContactMethod.includes('form') || csvContactMethod === 'contact_form') {
    contactMethod = 'contact_form';
  }

  if (csvContactMethod.includes('mail') || csvContactMethod === 'email') {
    contactMethod = 'email';
  }

  const dateSent = clean(row.dateSent);

  return new Outreach({
    companyName: clean(row.companyName),
    website: clean(row.website),
    contactEmail: clean(row.contactEmail).toLowerCase(),
    contactInfo: clean(row.contactInfo),
    contactMethod,
    fitReason: clean(row.fitReason),
    emailSubject: clean(row.emailSubject),
    emailBody: String(row.emailBody || '')
      .replace(/\\n/g, '\n')
      .replace(/\/n/g, '\n')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map(line => line.trimEnd())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
    status,
    dateSent: status === 'sent' && !dateSent ? today : dateSent,
    followUpDate: clean(row.followUpDate),
    replyObtained,
    replySummary: clean(row.replySummary),
    notes: clean(row.notes),
  });
}

function clean(value: string | undefined): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function parseBoolean(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'y'].includes(clean(value).toLowerCase());
}
