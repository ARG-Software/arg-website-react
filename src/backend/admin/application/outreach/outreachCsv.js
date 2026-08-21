import {
  cleanSingleLine,
  normalizeEmailDraft,
  OUTREACH_CONTACT_METHOD_VALUES,
  OUTREACH_STATUS_VALUES,
} from '../../domain/outreachRecord.js';
import { createAdminError } from '../errors.js';

export const OUTREACH_CSV_FIELDS = [
  'company_name',
  'website',
  'contact_email',
  'contact_info',
  'contact_method',
  'fit_reason',
  'email_subject',
  'email_body',
  'status',
  'date_sent',
  'follow_up_date',
  'reply_obtained',
  'reply_summary',
  'notes',
];

const MAX_IMPORT_ROWS = 30;

export function createOutreachCsv(records) {
  const rows = records.map(record =>
    OUTREACH_CSV_FIELDS.map(field => record.payload?.[field] ?? '')
  );

  return [OUTREACH_CSV_FIELDS, ...rows].map(row => row.map(escapeCsvCell).join(',')).join('\n');
}

export async function importOutreachCsv(input, { outreachRepository, clock }) {
  const rows = parseCsv(String(input.csv || ''));

  if (rows.length > MAX_IMPORT_ROWS) {
    throw createAdminError(400, 'too_many_rows', 'CSV import supports up to 30 rows');
  }

  const errors = [];
  const payloads = [];

  rows.forEach((row, index) => {
    const result = normalizeCsvRow(row, clock);

    if (result.error) {
      errors.push({ row: index + 2, error: result.error });
      return;
    }

    payloads.push(result.payload);
  });

  if (errors.length) {
    return { imported: 0, errors };
  }

  try {
    const records = await outreachRepository.createMany(payloads);
    return { imported: records.length, records, errors: [] };
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

function normalizeCsvRow(row, clock) {
  const statusResult = normalizeStatus(row.status, row.reply_obtained);
  const contactMethod = normalizeContactMethod(row.contact_method, row.contact_email);
  const payload = {
    company_name: clean(row.company_name),
    website: clean(row.website),
    contact_email: clean(row.contact_email).toLowerCase(),
    contact_info: clean(row.contact_info),
    contact_method: contactMethod,
    fit_reason: clean(row.fit_reason),
    email_subject: cleanSingleLine(row.email_subject),
    email_body: normalizeEmailDraft(row.email_body),
    status: statusResult.status,
    date_sent: toDateString(row.date_sent),
    follow_up_date: toDateString(row.follow_up_date),
    reply_obtained: statusResult.replyObtained,
    reply_summary: clean(row.reply_summary),
    notes: clean(row.notes),
  };

  if (!payload.company_name) return { error: 'Company name is required' };
  if (!OUTREACH_STATUS_VALUES.has(payload.status)) return { error: 'Unsupported status' };
  if (!OUTREACH_CONTACT_METHOD_VALUES.has(payload.contact_method)) {
    return { error: 'Unsupported contact method' };
  }

  if (payload.status === 'sent' && !payload.date_sent) {
    payload.date_sent = clock.today();
  }

  return { payload };
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
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
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
