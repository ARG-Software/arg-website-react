import { OUTREACH_FIELDS, OUTREACH_STATUS_VALUES } from '../../domain/outreachRecord.js';
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
  const nextPayload = {
    ...record.payload,
    ...sanitizedChanges,
  };

  if (nextPayload.status === 'sent' && !nextPayload.date_sent) {
    nextPayload.date_sent = clock.today();
  }

  const updatedRecord = await outreachRepository.savePayload(input.id, nextPayload);

  await auditRepository.recordUpdated({
    recordId: input.id,
    actorEmail: input.actorEmail,
    changedFields: Object.keys(input.changes || {}).filter(field => OUTREACH_FIELDS.has(field)),
  });

  return updatedRecord;
}

function sanitizeChanges(changes = {}) {
  const sanitized = {};

  for (const [field, value] of Object.entries(changes)) {
    if (!OUTREACH_FIELDS.has(field)) continue;

    sanitized[field] = typeof value === 'string' ? value.trim() : value || null;
  }

  if (sanitized.status && !OUTREACH_STATUS_VALUES.has(sanitized.status)) {
    throw createAdminError(400, 'invalid_status', 'Unsupported outreach status');
  }

  return sanitized;
}
