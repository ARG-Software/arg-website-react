export const OUTREACH_STATUSES = [
  { value: 'sent', label: 'Sent' },
  { value: 'not_sent', label: 'Not sent' },
];

export function getStatusLabel(status) {
  return OUTREACH_STATUSES.find(item => item.value === status)?.label || status || 'Not sent';
}

export function buildMailtoUrl(record) {
  const email = record.contact_email || extractEmail(record.contact_info);
  const params = new URLSearchParams();

  if (record.email_subject) params.set('subject', record.email_subject);
  if (record.email_body) params.set('body', record.email_body);

  return `mailto:${email || ''}?${params.toString()}`;
}

export function getRecordSearchText(record) {
  return [
    record.company_name,
    record.website,
    record.contact_email,
    record.contact_info,
    record.fit_reason,
    record.email_subject,
    record.notes,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function extractEmail(value = '') {
  return value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
}
