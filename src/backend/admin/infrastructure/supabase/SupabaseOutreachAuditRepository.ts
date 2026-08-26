import crypto from 'node:crypto';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { IAdminConfiguration } from '../../application/config/IAdminConfiguration.js';
import type { IOutreachAuditRepository } from '../../application/ports/repositories/IOutreachRepository.js';

export class SupabaseOutreachAuditRepository implements IOutreachAuditRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly configuration: IAdminConfiguration
  ) {}

  async recordUpdated({
    actorEmail,
    changedFields,
    recordId,
  }: {
    actorEmail: string;
    changedFields: string[];
    recordId: string;
  }): Promise<void> {
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

  private hashEmail(email: string): string {
    return crypto
      .createHash('sha256')
      .update(`${email.toLowerCase()}:${this.configuration.getAuditSalt()}`)
      .digest('hex');
  }
}
