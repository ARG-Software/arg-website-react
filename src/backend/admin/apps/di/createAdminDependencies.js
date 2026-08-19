import { createAdminAccessPolicy } from '../../application/admin/adminAccessPolicy.js';
import { getAdminConfig } from '../../infrastructure/config/adminConfig.js';
import { createOutreachPayloadCipher } from '../../infrastructure/crypto/outreachPayloadCipher.js';
import { createSupabaseAdminClient } from '../../infrastructure/supabase/SupabaseClientFactory.js';
import { SupabaseAdminIdentityProvider } from '../../infrastructure/supabase/SupabaseAdminIdentityProvider.js';
import { SupabaseOutreachAuditRepository } from '../../infrastructure/supabase/SupabaseOutreachAuditRepository.js';
import { SupabaseOutreachRepository } from '../../infrastructure/supabase/SupabaseOutreachRepository.js';
import { systemClock } from '../../infrastructure/system/systemClock.js';

export function createAdminDependencies({ env = process.env } = {}) {
  const config = getAdminConfig(env);

  return {
    createOutreachDependencies,
  };

  function createOutreachDependencies() {
    const client = createSupabaseAdminClient(config);
    const payloadCipher = createOutreachPayloadCipher(env);

    return {
      adminAccessPolicy: createAdminAccessPolicy(config.allowedAdminEmails),
      auditRepository: new SupabaseOutreachAuditRepository(client, config.auditSalt),
      clock: systemClock,
      identityProvider: new SupabaseAdminIdentityProvider(client),
      outreachRepository: new SupabaseOutreachRepository(client, payloadCipher),
    };
  }
}
