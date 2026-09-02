export const OUTREACH_STATUSES = [
  { value: 'sent', label: 'Sent' },
  { value: 'not_sent', label: 'Not sent' },
];

export const OUTREACH_CONTACT_METHODS = [
  { value: 'email', label: 'Email' },
  { value: 'contact_form', label: 'Contact form' },
];

export function getStatusLabel(status) {
  return OUTREACH_STATUSES.find(item => item.value === status)?.label || status || 'Not sent';
}

export function getContactMethodLabel(contactMethod) {
  return (
    OUTREACH_CONTACT_METHODS.find(item => item.value === contactMethod)?.label ||
    contactMethod ||
    '-'
  );
}

export function buildMailtoUrl(record) {
  const email = record.contactEmail || extractEmail(record.contactInfo);
  const params = [];

  if (record.emailSubject) params.push(`subject=${encodeURIComponent(record.emailSubject)}`);
  if (record.emailBody) {
    params.push(`body=${encodeURIComponent(normalizeEmailBody(record.emailBody))}`);
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
    record.companyName,
    record.website,
    record.contactEmail,
    record.contactInfo,
    record.fitReason,
    record.emailSubject,
    record.notes,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function extractEmail(value = '') {
  return value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
}
