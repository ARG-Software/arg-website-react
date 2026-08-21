import {
  OUTREACH_CONTACT_METHOD_VALUES,
  OUTREACH_FIELDS,
  OUTREACH_STATUS_VALUES,
} from '../../domain/outreachRecord.js';
import { createAdminError } from '../errors.js';

export async function updateOutreachRecord(input, { auditRepository, clock, outreachRepository }) {
  if (!input.id) {
    throw createAdminError(400, 'missing_id', 'Record id is required');
  }

  const record = await outreachRepository.findById(input.id);

  if (!record) {
    throw createAdminError(404, 'not_found', 'Outreach record not found');
  }

  const sanitizedChanges = sanitizeChanges(input.changes);

  if (record.payload.status === 'sent') {
    assertSentRecordLockedFieldUnchanged(record, sanitizedChanges, 'status', 'status');
    assertSentRecordLockedFieldUnchanged(
      record,
      sanitizedChanges,
      'contact_method',
      'contact method'
    );
    assertSentRecordLockedFieldUnchanged(record, sanitizedChanges, 'date_sent', 'sent date');
  }

  const nextPayload = {
    ...record.payload,
    ...sanitizedChanges,
  };

  if (nextPayload.status === 'sent' && !nextPayload.date_sent) {
    nextPayload.date_sent = clock.today();
  }

  validatePayload(nextPayload);

  const updatedRecord = await outreachRepository.savePayload(input.id, nextPayload);

  await auditRepository.recordUpdated({
    recordId: input.id,
    actorEmail: input.actorEmail,
    changedFields: Object.keys(input.changes || {}).filter(field => OUTREACH_FIELDS.has(field)),
  });

  return updatedRecord;
}

function assertSentRecordLockedFieldUnchanged(record, changes, field, label) {
  if (!(field in changes) || changes[field] === record.payload[field]) return;

  throw createAdminError(
    400,
    `sent_${field}_locked`,
    `Sent outreach records cannot change ${label}`
  );
}

function sanitizeChanges(changes = {}) {
  const sanitized = {};

  for (const [field, value] of Object.entries(changes)) {
    if (!OUTREACH_FIELDS.has(field)) continue;

    if (field === 'reply_obtained') {
      sanitized[field] = Boolean(value);
      continue;
    }

    sanitized[field] = typeof value === 'string' ? value.trim() : value || null;
  }

  if (sanitized.status && !OUTREACH_STATUS_VALUES.has(sanitized.status)) {
    throw createAdminError(400, 'invalid_status', 'Unsupported outreach status');
  }

  if (sanitized.contact_method && !OUTREACH_CONTACT_METHOD_VALUES.has(sanitized.contact_method)) {
    throw createAdminError(400, 'invalid_contact_method', 'Unsupported contact method');
  }

  return sanitized;
}

function validatePayload(payload) {
  if (!payload.company_name) {
    throw createAdminError(400, 'missing_company_name', 'Company name is required');
  }

  if (!OUTREACH_STATUS_VALUES.has(payload.status)) {
    throw createAdminError(400, 'invalid_status', 'Unsupported outreach status');
  }

  if (!OUTREACH_CONTACT_METHOD_VALUES.has(payload.contact_method)) {
    throw createAdminError(400, 'invalid_contact_method', 'Unsupported contact method');
  }

  if (payload.status === 'sent' && !payload.date_sent) {
    throw createAdminError(400, 'missing_sent_date', 'Sent records require a sent date');
  }
}
