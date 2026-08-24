import { config as loadDotenv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';

import { Outreach } from '../src/backend/admin/domain/outreach.js';
import type { AdminConfig } from '../src/backend/admin/apps/config/AdminConfig.js';
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
const outreachConfig = createOutreachConfig();

const rows = records.map(record => toOutreachDatabaseRow(record, outreachConfig));

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
    const companyIndex = normalizeCompanyName(record.companyName);
    const emailIndex = normalizeEmail(record.contactEmail);

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
      const record = normalizeRow(row, sheetName, sourceRowNumber);

      records.push(record);
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

  return new Outreach({
    companyName: clean(row.Agency),
    website: clean(row.Website),
    contactEmail: contactEmail.toLowerCase(),
    contactInfo,
    contactMethod: normalizeContactMethod(row['Contact Method'], contactEmail),
    fitReason: clean(row['Focus / Why Good Fit']),
    emailSubject: clean(row['Email Subject']),
    emailBody: normalizeEmailDraft(row['Email Draft']),
    status: status.status,
    dateSent,
    followUpDate: toDateString(row['Follow-up Date']) || '',
    replyObtained: status.replyObtained,
    replySummary:
      response && response.toLowerCase() !== 'no' ? `Response marked: ${response}` : '',
    notes: clean(row.Notes),
  });
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
    const status = item.status;
    summary[status] = (summary[status] || 0) + 1;
    if (item.replyObtained) {
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

function normalizeStatus(value, replyObtained) {
  if (replyObtained || clean(value).toLowerCase() === 'sent') {
    return { status: 'sent', replyObtained: Boolean(replyObtained) };
  }

  return { status: 'not_sent', replyObtained: false };
}

function normalizeContactMethod(value, contactEmail = '') {
  const method = clean(value).toLowerCase().replace(/[\s-]+/g, '_');

  if (method.includes('form')) return 'contact_form';
  if (method.includes('mail')) return 'email';
  if (method === 'contact_form' || method === 'form') return 'contact_form';
  if (method === 'email') return 'email';

  return clean(contactEmail) ? 'email' : 'contact_form';
}

function normalizeEmailDraft(value) {
  return String(value || '')
    .replace(/\\n/g, '\n')
    .replace(/\/n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeCompanyName(value) {
  return clean(value).toLowerCase();
}

function normalizeEmail(value) {
  return clean(value).toLowerCase();
}

function createOutreachConfig(): AdminConfig {
  return {
    getActiveOutreachEncryptionKeyVersion() {
      return Number(process.env.OUTREACH_ENCRYPTION_KEY_ACTIVE_VERSION || 1);
    },
    getOutreachEncryptionKey(version) {
      return process.env[`OUTREACH_ENCRYPTION_KEY_${version}`] || process.env.OUTREACH_ENCRYPTION_KEY || '';
    },
    getOutreachBlindIndexKey() {
      return requiredEnv('OUTREACH_BLIND_INDEX_KEY');
    },
  } as unknown as AdminConfig;
}
