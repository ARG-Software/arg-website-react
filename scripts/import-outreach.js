import { config as loadDotenv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';

import { normalizeContactMethod, normalizeStatus } from '../src/backend/admin/application/outreach/outreachCsv.js';
import {
  cleanSingleLine,
  normalizeEmailDraft,
} from '../src/backend/admin/domain/outreachRecord.js';
import {
  createOutreachPayloadCipher,
  normalizeCompanyName,
  normalizeEmail,
} from '../src/backend/admin/infrastructure/crypto/outreachPayloadCipher.js';
import { toOutreachDatabaseRow } from '../src/backend/admin/infrastructure/supabase/outreachRows.js';

loadDotenv({ path: '.env', quiet: true });

const inputPath = process.argv[2];
const isDryRun = process.argv.includes('--dry-run');
const fallbackSentDateBase = getFallbackSentDateBase();

if (!inputPath) {
  throw new Error('Usage: node scripts/import-outreach.js <workbook.xlsx> [--dry-run]');
}

const importPlan = createImportPlan(loadWorkbookRecords(inputPath));
const { records } = importPlan;

if (isDryRun) {
  console.log(`Parsed ${records.length} outreach rows from ${inputPath}`);
  if (importPlan.skippedDuplicates.length) {
    console.log(`Skipped ${importPlan.skippedDuplicates.length} duplicate company/email rows`);
  }
  console.table(summarizeByStatus(records));
  process.exit(0);
}

const supabaseUrl = requiredEnv('ADMIN_DATABASE_URL');
const serviceRoleKey = requiredEnv('ADMIN_DATABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const payloadCipher = createOutreachPayloadCipher(process.env);

const rows = records.map(record => toOutreachDatabaseRow(record.payload, payloadCipher));

for (const batch of chunk(rows, 100)) {
  const { error } = await supabase
    .from('outreach_records')
    .upsert(batch, { onConflict: 'company_name_blind_index' });

  if (error) {
    throw error;
  }
}

console.log(`Imported ${rows.length} outreach records`);
if (importPlan.skippedDuplicates.length) {
  console.log(`Skipped ${importPlan.skippedDuplicates.length} duplicate company/email rows`);
}

function createImportPlan(inputRecords) {
  const companyIndexes = new Set();
  const emailIndexes = new Set();
  const records = [];
  const skippedDuplicates = [];

  for (const record of inputRecords) {
    const companyIndex = normalizeCompanyName(record.payload.company_name);
    const emailIndex = normalizeEmail(record.payload.contact_email);

    if (companyIndexes.has(companyIndex) || (emailIndex && emailIndexes.has(emailIndex))) {
      skippedDuplicates.push(record);
      continue;
    }

    companyIndexes.add(companyIndex);
    if (emailIndex) emailIndexes.add(emailIndex);
    records.push(record);
  }

  return { records, skippedDuplicates };
}

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
      const payload = normalizeRow(row, sheetName, sourceRowNumber);

      records.push({ payload });
    }
  }

  return records;
}

function normalizeRow(row, sourceRound, sourceRowNumber) {
  const contactInfo = clean(row['Contact Info']);
  const response = clean(row['Response?']);
  const contactEmail = extractEmail(contactInfo);
  const status = normalizeWorkbookStatus(row.Status, response, sourceRound);
  const dateSent =
    status.status === 'sent'
      ? toDateString(row['Date Sent']) || createFallbackSentDate(sourceRowNumber)
      : '';

  return {
    company_name: clean(row.Agency),
    website: clean(row.Website),
    contact_email: contactEmail.toLowerCase(),
    contact_info: contactInfo,
    contact_method: normalizeContactMethod(row['Contact Method'], contactEmail),
    fit_reason: clean(row['Focus / Why Good Fit']),
    email_subject: cleanSingleLine(row['Email Subject']),
    email_body: normalizeEmailDraft(row['Email Draft']),
    status: status.status,
    date_sent: dateSent,
    follow_up_date: toDateString(row['Follow-up Date']),
    reply_obtained: status.replyObtained,
    reply_summary:
      response && response.toLowerCase() !== 'no' ? `Response marked: ${response}` : '',
    notes: clean(row.Notes),
  };
}

function normalizeWorkbookStatus(statusValue, responseValue, sourceRound) {
  const status = clean(statusValue).toLowerCase();
  const response = clean(responseValue).toLowerCase();

  if (response && response !== 'no') return normalizeStatus('sent', true);
  if (status === 'sent' || sourceRound.toLowerCase() === 'already sent') {
    return normalizeStatus('sent', false);
  }

  return normalizeStatus('not_sent', false);
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
    if (item.payload.reply_obtained) {
      summary.reply_obtained = (summary.reply_obtained || 0) + 1;
    }
    return summary;
  }, {});
}

function extractEmail(value = '') {
  return value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
}

function getFallbackSentDateBase() {
  const configured = process.env.OUTREACH_IMPORT_FALLBACK_SENT_DATE;
  if (configured) return configured;

  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 30);
  return date.toISOString().slice(0, 10);
}

function createFallbackSentDate(rowNumber) {
  const date = new Date(`${fallbackSentDateBase}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + (rowNumber % 7));
  return date.toISOString().slice(0, 10);
}

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
