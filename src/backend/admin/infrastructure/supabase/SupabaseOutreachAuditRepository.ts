import crypto from 'node:crypto';

import type { IOutreachAuditRepository } from '../../application/ports/repositories/IOutreachRepository.js';

export class SupabaseOutreachAuditRepository implements IOutreachAuditRepository {
  constructor(private readonly client: any, private readonly auditSalt: string) {}

  async recordUpdated({ actorEmail, changedFields, recordId }) {
    const { error } = await this.client.from('outreach_audit_events').insert({
      outreach_record_id: recordId,
      actor_email_hash: this.hashEmail(actorEmail),
      action: 'outreach_record_updated',
      metadata: { changed_fields: changedFields },
    });

    if (error) {
      console.error('Failed to write outreach audit event', error);
    }
  }

  hashEmail(email) {
    return crypto
      .createHash('sha256')
      .update(`${email.toLowerCase()}:${this.auditSalt}`)
      .digest('hex');
  }
}
