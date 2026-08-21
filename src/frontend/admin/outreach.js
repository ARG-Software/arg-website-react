export const OUTREACH_STATUSES = [
  { value: 'sent', label: 'Sent' },
  { value: 'not_sent', label: 'Not sent' },
];

export function getStatusLabel(status) {
  return OUTREACH_STATUSES.find(item => item.value === status)?.label || status || 'Not sent';
}

export function buildMailtoUrl(record) {
  const email = record.contact_email || extractEmail(record.contact_info);
  const params = [];

  if (record.email_subject) params.push(`subject=${encodeURIComponent(record.email_subject)}`);
  if (record.email_body) {
    params.push(`body=${encodeURIComponent(normalizeEmailBody(record.email_body))}`);
  }

  return `mailto:${email || ''}${params.length ? `?${params.join('&')}` : ''}`;
}

function normalizeEmailBody(value) {
  return String(value || '')
    .replace(/\\n/g, '\n')
    .replace(/\/n/g, '\n')
    .replace(/\r\n/g, '\n');
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
