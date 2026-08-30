import type { SupabaseClient } from '@supabase/supabase-js';

import type { ILogger } from '../../../../shared/logger/ilogger.js';
import type { IAdminConfiguration } from '../../../application/config/iadmin.configuration.js';
import { hashWithSalt } from '../../../application/crypto/encode.js';
import type { IOutreachAuditRepository } from '../../../application/ports/repositories/ioutreach.repository.js';

export class SupabaseOutreachAuditRepository implements IOutreachAuditRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly configuration: IAdminConfiguration,
    private readonly logger?: ILogger
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
      actor_email_hash: hashWithSalt(actorEmail.toLowerCase(), this.configuration.getAuditSalt()),
      action: 'outreach_record_updated',
      metadata: { changed_fields: changedFields },
    });

    if (error) {
      this.logger?.error('Outreach audit event write failed', { error, changedFieldCount: changedFields.length });
    }
  }
}
