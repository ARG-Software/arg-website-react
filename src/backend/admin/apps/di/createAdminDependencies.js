import { createAdminAccessPolicy } from '../../application/admin/adminAccessPolicy.js';
import { getAdminConfig } from '../../infrastructure/config/adminConfig.js';
import { createOutreachPayloadCipher } from '../../infrastructure/crypto/outreachPayloadCipher.js';
import {
  createSupabaseAdminAuthClient,
  createSupabaseAdminClient,
} from '../../infrastructure/supabase/SupabaseClientFactory.js';
import { SupabaseAdminIdentityProvider } from '../../infrastructure/supabase/SupabaseAdminIdentityProvider.js';
import { SupabaseAdminUserRepository } from '../../infrastructure/supabase/SupabaseAdminUserRepository.js';
import { SupabaseOutreachAuditRepository } from '../../infrastructure/supabase/SupabaseOutreachAuditRepository.js';
import { SupabaseOutreachRepository } from '../../infrastructure/supabase/SupabaseOutreachRepository.js';
import { systemClock } from '../../infrastructure/system/systemClock.js';
import { createAltchaChallenge, verifyAltchaPayload } from '../../../shared/security/altcha.js';
import { getRateLimitConfig } from '../../../shared/security/rateLimit.js';
import { SupabaseRateLimitStore } from '../../../shared/security/rateLimitStores.js';

export function createAdminDependencies({ env = process.env } = {}) {
  return createAdminDependenciesWithClients({
    env,
    createAuthClient: createSupabaseAdminAuthClient,
    createServiceClient: createSupabaseAdminClient,
  });
}

export function createAdminDependencyFactory({
  createAuthClient = createSupabaseAdminAuthClient,
  createServiceClient = createSupabaseAdminClient,
} = {}) {
  return function createInjectedAdminDependencies({ env = process.env } = {}) {
    return createAdminDependenciesWithClients({ env, createAuthClient, createServiceClient });
  };
}

function createAdminDependenciesWithClients({ env, createAuthClient, createServiceClient }) {
  const config = getAdminConfig(env);

  return {
    createLoginDependencies() {
      const serviceClient = createServiceClient(config);
      const authClient = createAuthClient(config);
      const adminUserRepository = new SupabaseAdminUserRepository(serviceClient);

      return {
        adminAccessPolicy: createAdminAccessPolicy(adminUserRepository),
        humanVerification: {
          createChallenge() {
            return createAltchaChallenge(env);
          },
          verifyPayload(payload) {
            return verifyAltchaPayload(payload, env);
          },
        },
        identityProvider: new SupabaseAdminIdentityProvider(authClient),
        loginRateLimit: {
          config: getRateLimitConfig(env, {
            prefix: 'ADMIN_LOGIN',
            defaultSalt: config.loginRateLimitSalt,
          }),
          store: new SupabaseRateLimitStore(serviceClient, 'hit_admin_rate_limit'),
        },
      };
    },
    createMaintenanceDependencies() {
      return {
        supabase: createServiceClient(config),
        tableName: 'outreach_records',
      };
    },
    createOutreachDependencies() {
      const client = createServiceClient(config);
      const payloadCipher = createOutreachPayloadCipher(env);
      const adminUserRepository = new SupabaseAdminUserRepository(client);

      return {
        adminAccessPolicy: createAdminAccessPolicy(adminUserRepository),
        auditRepository: new SupabaseOutreachAuditRepository(client, config.auditSalt),
        clock: systemClock,
        identityProvider: new SupabaseAdminIdentityProvider(client),
        outreachRepository: new SupabaseOutreachRepository(client, payloadCipher),
      };
    },
  };
}
