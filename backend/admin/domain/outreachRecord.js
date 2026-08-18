export const OUTREACH_FIELDS = new Set([
  'company_name',
  'website',
  'contact_name',
  'contact_email',
  'contact_info',
  'contact_method',
  'fit_reason',
  'email_subject',
  'email_body',
  'status',
  'date_sent',
  'follow_up_date',
  'reply_summary',
  'notes',
  'source_round',
]);

export const OUTREACH_STATUS_VALUES = new Set([
  'draft',
  'ready',
  'sent',
  'replied',
  'follow_up_needed',
  'closed',
  'not_relevant',
]);

export function createOutreachRecordResponse(record) {
  return {
    id: record.id,
    sourceRound: record.sourceRound,
    sourceRowNumber: record.sourceRowNumber,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    ...record.payload,
  };
}
