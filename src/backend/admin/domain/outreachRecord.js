export const OUTREACH_FIELDS = new Set([
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
]);

export const OUTREACH_STATUS_VALUES = new Set(['sent', 'not_sent']);
export const OUTREACH_CONTACT_METHOD_VALUES = new Set(['email', 'contact_form']);

export function normalizeEmailDraft(value) {
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

export function cleanSingleLine(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function createOutreachRecordResponse(record) {
  return record;
}
