import { config as loadDotenv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';

import { encryptOutreachPayload } from '../backend/admin/infrastructure/crypto/outreachPayloadCipher.js';

loadDotenv({ path: '.env', quiet: true });

const STATUS_VALUES = new Set([
  'draft',
  'ready',
  'sent',
  'replied',
  'follow_up_needed',
  'closed',
  'not_relevant',
]);

const inputPath = process.argv[2];
const isDryRun = process.argv.includes('--dry-run');

if (!inputPath) {
  throw new Error('Usage: node scripts/import-outreach.js <workbook.xlsx> [--dry-run]');
}

const records = loadWorkbookRecords(inputPath);

if (isDryRun) {
  console.log(`Parsed ${records.length} outreach rows from ${inputPath}`);
  console.table(summarizeByStatus(records));
  process.exit(0);
}

const supabaseUrl = requiredEnv('DATABASE_URL');
const serviceRoleKey = requiredEnv('DATABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const rows = records.map(record => ({
  source_round: record.sourceRound,
  source_row_number: record.sourceRowNumber,
  ...encryptOutreachPayload(record.payload),
}));

for (const batch of chunk(rows, 100)) {
  const { error } = await supabase
    .from('outreach_records')
    .upsert(batch, { onConflict: 'source_round,source_row_number' });

  if (error) {
    throw error;
  }
}

console.log(`Imported ${rows.length} outreach records`);

function loadWorkbookRecords(path) {
  const workbook = XLSX.readFile(path, { cellDates: true });
  const records = [];

  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      defval: '',
      blankrows: false,
      raw: false,
    });

    for (const row of rows) {
      if (!hasMeaningfulValue(row)) continue;

      const sourceRowNumber = Number(row.__rowNum__ || records.length + 1) + 1;
      const payload = normalizeRow(row, sheetName);

      records.push({ sourceRound: sheetName, sourceRowNumber, payload });
    }
  }

  return records;
}

function normalizeRow(row, sourceRound) {
  const contactInfo = clean(row['Contact Info']);
  const parsedContact = parseContactInfo(contactInfo);
  const response = clean(row['Response?']);
  const status = normalizeStatus(row.Status, response, sourceRound);

  return {
    company_name: clean(row.Agency),
    website: clean(row.Website),
    contact_name: parsedContact.name,
    contact_email: parsedContact.email,
    contact_info: contactInfo,
    contact_method: clean(row['Contact Method']) || (parsedContact.email ? 'Email' : ''),
    fit_reason: clean(row['Focus / Why Good Fit']),
    email_subject: clean(row['Email Subject']),
    email_body: clean(row['Email Draft']),
    status,
    date_sent: toDateString(row['Date Sent']),
    follow_up_date: toDateString(row['Follow-up Date']),
    reply_summary:
      response && response.toLowerCase() !== 'no' ? `Response marked: ${response}` : '',
    notes: clean(row.Notes),
    source_round: sourceRound,
  };
}

function parseContactInfo(value) {
  const email = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
  const name = email
    ? value
        .replace(email, '')
        .replace(/[<>()|,;-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    : '';

  return { email, name };
}

function normalizeStatus(statusValue, responseValue, sourceRound) {
  const status = clean(statusValue).toLowerCase();
  const response = clean(responseValue).toLowerCase();

  if (response && response !== 'no') return 'replied';
  if (status === 'sent' || sourceRound.toLowerCase() === 'already sent') return 'sent';
  if (status === 'not sent') return 'ready';
  if (STATUS_VALUES.has(status)) return status;

  return 'draft';
}

function toDateString(value) {
  const cleaned = clean(value);
  if (!cleaned) return null;

  const date = new Date(cleaned);
  if (Number.isNaN(date.getTime())) return cleaned;

  return date.toISOString().slice(0, 10);
}

function hasMeaningfulValue(row) {
  return Object.entries(row).some(([key, value]) => key !== '__rowNum__' && clean(value));
}

function clean(value) {
  return value === null || value === undefined ? '' : String(value).replace(/\s+/g, ' ').trim();
}

function chunk(items, size) {
  const batches = [];

  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }

  return batches;
}

function summarizeByStatus(items) {
  return items.reduce((summary, item) => {
    const status = item.payload.status;
    summary[status] = (summary[status] || 0) + 1;
    return summary;
  }, {});
}

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
