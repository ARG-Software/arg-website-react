import { authenticateAdmin as authenticateAdminUseCase } from '../application/admin/authenticateAdmin.js';
import { createAdminAccessPolicy } from '../application/admin/adminAccessPolicy.js';
import { listOutreachRecords as listOutreachRecordsUseCase } from '../application/outreach/listOutreachRecords.js';
import { updateOutreachRecord as updateOutreachRecordUseCase } from '../application/outreach/updateOutreachRecord.js';
import { getAdminConfig } from '../infrastructure/config/adminConfig.js';
import { createOutreachPayloadCipher } from '../infrastructure/crypto/outreachPayloadCipher.js';
import { createSupabaseAdminClient } from '../infrastructure/supabase/SupabaseClientFactory.js';
import { SupabaseAdminIdentityProvider } from '../infrastructure/supabase/SupabaseAdminIdentityProvider.js';
import { SupabaseOutreachAuditRepository } from '../infrastructure/supabase/SupabaseOutreachAuditRepository.js';
import { SupabaseOutreachRepository } from '../infrastructure/supabase/SupabaseOutreachRepository.js';
import { systemClock } from '../infrastructure/system/systemClock.js';

export function createAdminApp({ env = process.env } = {}) {
  const config = getAdminConfig(env);
  const client = createSupabaseAdminClient(config);
  const payloadCipher = createOutreachPayloadCipher(env);
  const dependencies = {
    adminAccessPolicy: createAdminAccessPolicy(config.allowedAdminEmails),
    auditRepository: new SupabaseOutreachAuditRepository(client, config.auditSalt),
    clock: systemClock,
    identityProvider: new SupabaseAdminIdentityProvider(client),
    outreachRepository: new SupabaseOutreachRepository(client, payloadCipher),
  };

  return {
    authenticateAdmin(token) {
      return authenticateAdminUseCase(token, dependencies);
    },
    listOutreachRecords() {
      return listOutreachRecordsUseCase(dependencies);
    },
    updateOutreachRecord(input) {
      return updateOutreachRecordUseCase(input, dependencies);
    },
  };
}
