import { createAdminAccessPolicy } from '../../application/auth/policies/adminAccessPolicy.js';
import { AdminSecurityCodec } from '../../application/usecases/security/AdminSecurityCodec.js';
import { AdminConfig } from '../config/AdminConfig.js';
import { FallbackGeolocationProvider } from '../../infrastructure/geolocation/FallbackGeolocationProvider.js';
import { HeaderGeolocationProvider } from '../../infrastructure/http/HeaderGeolocationProvider.js';
import {
  createSupabaseAdminAuthClient,
  createSupabaseAdminClient,
} from '../../infrastructure/supabase/SupabaseClientFactory.js';
import { SupabaseAdminIdentityProvider } from '../../infrastructure/supabase/SupabaseAdminIdentityProvider.js';
import { SupabaseAdminUserRepository } from '../../infrastructure/supabase/SupabaseAdminUserRepository.js';
import { SupabaseAssistantConversationRepository } from '../../infrastructure/supabase/SupabaseAssistantConversationRepository.js';
import { SupabaseOutreachAuditRepository } from '../../infrastructure/supabase/SupabaseOutreachAuditRepository.js';
import { SupabaseOutreachRepository } from '../../infrastructure/supabase/SupabaseOutreachRepository.js';
import { SupabaseGeolocationProvider } from '../../infrastructure/supabase/SupabaseGeolocationProvider.js';
import { SupabaseVisitRepository } from '../../infrastructure/supabase/SupabaseVisitRepository.js';
import { systemClock } from '../../infrastructure/system/systemClock.js';
import { createAltchaChallenge, verifyAltchaPayload } from '../../../shared/security/altcha.js';
import { SupabaseRateLimitStore } from '../../../shared/security/rateLimitStores.js';

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;
type AdminClientFactory = (config: AdminConfig) => AdminClient;

interface IAdminDependencyFactoryOptions {
  createAuthClient?: AdminClientFactory;
  createServiceClient?: AdminClientFactory;
}

export interface IAdminDependenciesOptions {
  config?: AdminConfig;
}

export function createAdminDependencies({ config = AdminConfig.load() }: IAdminDependenciesOptions = {}) {
  return createAdminDependenciesWithClients({
    config,
    createAuthClient: createSupabaseAdminAuthClient,
    createServiceClient: createSupabaseAdminClient,
  });
}

export function createAdminDependencyFactory({
  createAuthClient = createSupabaseAdminAuthClient,
  createServiceClient = createSupabaseAdminClient,
}: IAdminDependencyFactoryOptions = {}) {
  return function createInjectedAdminDependencies({
    config = AdminConfig.load(),
  }: IAdminDependenciesOptions = {}) {
    return createAdminDependenciesWithClients({ config, createAuthClient, createServiceClient });
  };
}

function createAdminDependenciesWithClients({
  config,
  createAuthClient,
  createServiceClient,
}: {
  config: AdminConfig;
  createAuthClient: AdminClientFactory;
  createServiceClient: AdminClientFactory;
}) {
  return {
    createLoginDependencies() {
      const serviceClient = createServiceClient(config);
      const authClient = createAuthClient(config);
      const adminUserRepository = new SupabaseAdminUserRepository(serviceClient);

      return {
        adminAccessPolicy: createAdminAccessPolicy(adminUserRepository),
        humanVerification: {
          createChallenge() {
            return createAltchaChallenge(config.getAltchaSettings());
          },
          verifyPayload(payload: string) {
            return verifyAltchaPayload(payload, config.getAltchaVerificationSettings());
          },
        },
        identityProvider: new SupabaseAdminIdentityProvider(authClient),
        loginRateLimit: {
          config: config.getLoginRateLimitConfig(),
          store: new SupabaseRateLimitStore(serviceClient, 'hit_admin_rate_limit'),
        },
        secureCookies: config.getSecureCookies(),
      };
    },
    createSessionDependencies() {
      const authClient = createAuthClient(config);
      const serviceClient = createServiceClient(config);
      const adminUserRepository = new SupabaseAdminUserRepository(serviceClient);

      return {
        adminAccessPolicy: createAdminAccessPolicy(adminUserRepository),
        identityProvider: new SupabaseAdminIdentityProvider(authClient),
      };
    },
    createMaintenanceDependencies() {
      return {
        supabase: createServiceClient(config),
        tableName: 'outreach_records',
      };
    },
    createAssistantConversationLogDependencies() {
      const client = createServiceClient(config);
      const securityCodec = new AdminSecurityCodec(config);

      return {
        conversationRepository: new SupabaseAssistantConversationRepository(client, securityCodec),
        logRateLimit: {
          config: config.getAssistantConversationLogRateLimitConfig(),
          store: new SupabaseRateLimitStore(client, 'hit_admin_rate_limit'),
        },
      };
    },
    createAssistantConversationAdminDependencies() {
      const client = createServiceClient(config);
      const securityCodec = new AdminSecurityCodec(config);
      const adminUserRepository = new SupabaseAdminUserRepository(client);

      return {
        adminAccessPolicy: createAdminAccessPolicy(adminUserRepository),
        conversationRepository: new SupabaseAssistantConversationRepository(client, securityCodec),
        identityProvider: new SupabaseAdminIdentityProvider(client),
      };
    },
    createAssistantConversationRetentionDependencies() {
      const client = createServiceClient(config);
      const securityCodec = new AdminSecurityCodec(config);

      return {
        conversationRepository: new SupabaseAssistantConversationRepository(client, securityCodec),
      };
    },
    createVisitIngestDependencies() {
      const client = createServiceClient(config);
      const securityCodec = new AdminSecurityCodec(config);

      return {
        geolocationProvider: new FallbackGeolocationProvider([
          new SupabaseGeolocationProvider(client),
          new HeaderGeolocationProvider(),
        ]),
        visitRepository: new SupabaseVisitRepository(client),
        securityCodec,
        visitRateLimit: {
          config: config.getVisitLogRateLimitConfig(),
          store: new SupabaseRateLimitStore(client, 'hit_admin_rate_limit'),
        },
      };
    },
    createVisitAdminDependencies() {
      const client = createServiceClient(config);
      const adminUserRepository = new SupabaseAdminUserRepository(client);

      return {
        adminAccessPolicy: createAdminAccessPolicy(adminUserRepository),
        identityProvider: new SupabaseAdminIdentityProvider(client),
        visitRepository: new SupabaseVisitRepository(client),
      };
    },
    createVisitRetentionDependencies() {
      return {
        visitRepository: new SupabaseVisitRepository(createServiceClient(config)),
      };
    },
    createOutreachDependencies() {
      const client = createServiceClient(config);
      const securityCodec = new AdminSecurityCodec(config);
      const adminUserRepository = new SupabaseAdminUserRepository(client);

      return {
        adminAccessPolicy: createAdminAccessPolicy(adminUserRepository),
        auditRepository: new SupabaseOutreachAuditRepository(client, config.getAuditSalt()),
        clock: systemClock,
        identityProvider: new SupabaseAdminIdentityProvider(client),
        outreachRepository: new SupabaseOutreachRepository(client, securityCodec),
      };
    },
  };
}
