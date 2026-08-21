import {
  cleanSingleLine,
  normalizeEmailDraft,
  OUTREACH_CONTACT_METHOD_VALUES,
  OUTREACH_STATUS_VALUES,
} from '../../domain/outreachRecord.js';
import { createAdminError } from '../errors.js';

export const OUTREACH_CSV_FIELDS = [
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

const MAX_IMPORT_ROWS = 30;

export function createOutreachCsv(records) {
  const rows = records.map(record => OUTREACH_CSV_FIELDS.map(field => record[field] ?? ''));

  return [OUTREACH_CSV_FIELDS, ...rows].map(row => row.map(escapeCsvCell).join(',')).join('\n');
}

export async function importOutreachCsv(input, { outreachRepository, clock }) {
  const rows = parseCsv(String(input.csv || ''));

  if (rows.length > MAX_IMPORT_ROWS) {
    throw createAdminError(400, 'too_many_rows', 'CSV import supports up to 30 rows');
  }

  const errors = [];
  const records = [];

  rows.forEach((row, index) => {
    const result = normalizeCsvRow(row, clock);

    if (result.error) {
      errors.push({ row: index + 2, error: result.error });
      return;
    }

    records.push(result.record);
  });

  if (errors.length) {
    return { imported: 0, errors };
  }

  try {
    const createdRecords = await outreachRepository.createMany(records);
    return { imported: createdRecords.length, records: createdRecords, errors: [] };
  } catch (error) {
    if (isDuplicateError(error)) {
      throw createAdminError(
        409,
        'duplicate_record',
        'Company name or contact email already exists'
      );
    }

    throw error;
  }
}

export function normalizeStatus(value, replyValue = false) {
  const status = clean(value).toLowerCase();
  const replyObtained = parseBoolean(replyValue);

  if (replyObtained) return { status: 'sent', replyObtained: true };
  if (status === 'sent') return { status: 'sent', replyObtained };
  if (status === 'replied') return { status: 'sent', replyObtained: true };
  if (status === 'not_sent') return { status: 'not_sent', replyObtained: false };

  return { status: 'not_sent', replyObtained: false };
}

export function normalizeContactMethod(value, contactEmail = '') {
  const method = clean(value)
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (method.includes('form')) return 'contact_form';
  if (method.includes('mail')) return 'email';
  if (method === 'contact_form' || method === 'form') return 'contact_form';
  if (method === 'email') return 'email';
  if (!method) return clean(contactEmail) ? 'email' : 'contact_form';

  return clean(contactEmail) ? 'email' : 'contact_form';
}

function normalizeCsvRow(row, clock) {
  const statusResult = normalizeStatus(row.status, row.replyObtained);
  const contactMethod = normalizeContactMethod(row.contactMethod, row.contactEmail);
  const record = {
    companyName: clean(row.companyName),
    website: clean(row.website),
    contactEmail: clean(row.contactEmail).toLowerCase(),
    contactInfo: clean(row.contactInfo),
    contactMethod,
    fitReason: clean(row.fitReason),
    emailSubject: cleanSingleLine(row.emailSubject),
    emailBody: normalizeEmailDraft(row.emailBody),
    status: statusResult.status,
    dateSent: toDateString(row.dateSent),
    followUpDate: toDateString(row.followUpDate),
    replyObtained: statusResult.replyObtained,
    replySummary: clean(row.replySummary),
    notes: clean(row.notes),
  };

  if (!record.companyName) return { error: 'Company name is required' };
  if (!OUTREACH_STATUS_VALUES.has(record.status)) return { error: 'Unsupported status' };
  if (!OUTREACH_CONTACT_METHOD_VALUES.has(record.contactMethod)) {
    return { error: 'Unsupported contact method' };
  }

  if (record.status === 'sent' && !record.dateSent) {
    record.dateSent = clock.today();
  }

  return { record };
}

function parseCsv(csv) {
  const table = parseCsvRows(csv).filter(row => row.some(cell => clean(cell)));
  if (!table.length) return [];

  const headers = table[0].map(header => normalizeHeader(header));

  return table
    .slice(1)
    .map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] || ''])));
}

function parseCsvRows(csv) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  row.push(cell);
  rows.push(row);

  return rows;
}

function normalizeHeader(value) {
  const words = clean(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .split('_')
    .filter(Boolean);

  if (!words.length) return '';

  return (
    words[0] +
    words
      .slice(1)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('')
  );
}

function escapeCsvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);

  if (!/[",\n\r]/.test(text)) return text;

  return `"${text.replace(/"/g, '""')}"`;
}

function toDateString(value) {
  const cleaned = clean(value);
  if (!cleaned) return '';

  const date = new Date(cleaned);
  if (Number.isNaN(date.getTime())) return cleaned;

  return date.toISOString().slice(0, 10);
}

function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  return ['1', 'true', 'yes', 'y'].includes(clean(value).toLowerCase());
}

function clean(value) {
  return value === null || value === undefined ? '' : String(value).replace(/\s+/g, ' ').trim();
}

function isDuplicateError(error) {
  return error?.code === '23505' || /duplicate key/i.test(error?.message || '');
}
