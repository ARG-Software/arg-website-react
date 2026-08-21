export const OUTREACH_FIELDS = new Set([
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
  return {
    id: record.id,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    ...record.payload,
  };
}
