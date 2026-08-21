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

  if (record.status === 'sent') {
    assertSentRecordLockedFieldUnchanged(record, sanitizedChanges, 'status', 'status');
    assertSentRecordLockedFieldUnchanged(
      record,
      sanitizedChanges,
      'contactMethod',
      'contact method'
    );
    assertSentRecordLockedFieldUnchanged(record, sanitizedChanges, 'dateSent', 'sent date');
  }

  const nextRecord = {
    ...record,
    ...sanitizedChanges,
  };

  if (nextRecord.status === 'sent' && !nextRecord.dateSent) {
    nextRecord.dateSent = clock.today();
  }

  validateRecord(nextRecord);

  const updatedRecord = await outreachRepository.savePayload(input.id, nextRecord);

  await auditRepository.recordUpdated({
    recordId: input.id,
    actorEmail: input.actorEmail,
    changedFields: Object.keys(input.changes || {}).filter(field => OUTREACH_FIELDS.has(field)),
  });

  return updatedRecord;
}

function assertSentRecordLockedFieldUnchanged(record, changes, field, label) {
  if (!(field in changes) || changes[field] === record[field]) return;

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

    if (field === 'replyObtained') {
      sanitized[field] = Boolean(value);
      continue;
    }

    sanitized[field] = typeof value === 'string' ? value.trim() : value || null;
  }

  if (sanitized.status && !OUTREACH_STATUS_VALUES.has(sanitized.status)) {
    throw createAdminError(400, 'invalid_status', 'Unsupported outreach status');
  }

  if (sanitized.contactMethod && !OUTREACH_CONTACT_METHOD_VALUES.has(sanitized.contactMethod)) {
    throw createAdminError(400, 'invalid_contact_method', 'Unsupported contact method');
  }

  return sanitized;
}

function validateRecord(record) {
  if (!record.companyName) {
    throw createAdminError(400, 'missing_company_name', 'Company name is required');
  }

  if (!OUTREACH_STATUS_VALUES.has(record.status)) {
    throw createAdminError(400, 'invalid_status', 'Unsupported outreach status');
  }

  if (!OUTREACH_CONTACT_METHOD_VALUES.has(record.contactMethod)) {
    throw createAdminError(400, 'invalid_contact_method', 'Unsupported contact method');
  }

  if (record.status === 'sent' && !record.dateSent) {
    throw createAdminError(400, 'missing_sent_date', 'Sent records require a sent date');
  }
}
