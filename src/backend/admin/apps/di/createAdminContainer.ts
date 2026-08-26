import { createClient } from '@supabase/supabase-js';

import { verifyAltchaPayload } from '../../../shared/security/altcha.js';
import { SupabaseRateLimitStore } from '../../../shared/security/rateLimitStores.js';
import { AuthenticateUserUseCase } from '../../application/usecases/sessions/authenticateUserUseCase.js';
import { CreateOutreachCsvUseCase } from '../../application/usecases/outreach/createOutreachCsvUseCase.js';
import { DeleteAssistantConversationUseCase } from '../../application/usecases/assistantConversations/deleteAssistantConversationUseCase.js';
import { DeleteOldAssistantConversationsUseCase } from '../../application/usecases/assistantConversations/deleteOldAssistantConversationsUseCase.js';
import { DeleteOldVisitSessionsUseCase } from '../../application/usecases/visits/deleteOldVisitSessionsUseCase.js';
import { GetAssistantConversationUseCase } from '../../application/usecases/assistantConversations/getAssistantConversationUseCase.js';
import { GetOutreachChartUseCase } from '../../application/usecases/outreach/getOutreachChartUseCase.js';
import { GetOutreachSummaryUseCase } from '../../application/usecases/outreach/getOutreachSummaryUseCase.js';
import { GetUserSessionUseCase } from '../../application/usecases/sessions/getUserSessionUseCase.js';
import { ImportOutreachCsvUseCase } from '../../application/usecases/outreach/importOutreachCsvUseCase.js';
import { ListAssistantConversationsUseCase } from '../../application/usecases/assistantConversations/listAssistantConversationsUseCase.js';
import { ListOutreachRecordsUseCase } from '../../application/usecases/outreach/listOutreachRecordsUseCase.js';
import { ListVisitJourneyUseCase } from '../../application/usecases/visits/listVisitJourneyUseCase.js';
import { ListVisitMetricsUseCase } from '../../application/usecases/visits/listVisitMetricsUseCase.js';
import { ListVisitSessionsUseCase } from '../../application/usecases/visits/listVisitSessionsUseCase.js';
import { LogAssistantConversationUseCase } from '../../application/usecases/assistantConversations/logAssistantConversationUseCase.js';
import { LoginUserUseCase } from '../../application/usecases/sessions/loginUserUseCase.js';
import { RecordVisitSessionUseCase } from '../../application/usecases/visits/recordVisitSessionUseCase.js';
import { RefreshUserSessionUseCase } from '../../application/usecases/sessions/refreshUserSessionUseCase.js';
import { SignOutUserUseCase } from '../../application/usecases/sessions/signOutUserUseCase.js';
import { UpdateOutreachRecordUseCase } from '../../application/usecases/outreach/updateOutreachRecordUseCase.js';
import { UpdateUserUseCase } from '../../application/usecases/users/updateUserUseCase.js';
import { createUserAccessPolicy } from '../../application/policies/userAccessPolicy.js';
import { OutreachCsvParser } from '../../infrastructure/csv/OutreachCsvParser.js';
import { SupabaseAdminUserRepository } from '../../infrastructure/supabase/SupabaseAdminUserRepository.js';
import { SupabaseAssistantConversationRepository } from '../../infrastructure/supabase/SupabaseAssistantConversationRepository.js';
import { SupabaseGeolocationProvider } from '../../infrastructure/supabase/SupabaseGeolocationProvider.js';
import { SupabaseOutreachAuditRepository } from '../../infrastructure/supabase/SupabaseOutreachAuditRepository.js';
import { SupabaseOutreachRepository } from '../../infrastructure/supabase/SupabaseOutreachRepository.js';
import { SupabaseUserIdentityProvider } from '../../infrastructure/supabase/SupabaseUserIdentityProvider.js';
import { SupabaseVisitRepository } from '../../infrastructure/supabase/SupabaseVisitRepository.js';
import { systemClock } from '../../infrastructure/system/systemClock.js';
import { AdminConfig } from '../config/AdminConfig.js';

export function createAdminContainer() {
  const config = AdminConfig.load();
  const serviceClient = createClient(
    config.getAdminDatabaseUrl(),
    config.getAdminDatabaseServiceRoleKey(),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const authClient = createClient(config.getAdminDatabaseUrl(), config.getAdminDatabaseAnonKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const adminUserRepository = new SupabaseAdminUserRepository(serviceClient);
  const userAccessPolicy = createUserAccessPolicy(adminUserRepository);
  const identityProvider = new SupabaseUserIdentityProvider(authClient);
  const conversationRepository = new SupabaseAssistantConversationRepository(serviceClient, config);
  const outreachRepository = new SupabaseOutreachRepository(serviceClient, config);
  const visitRepository = new SupabaseVisitRepository(serviceClient);
  const csvParser = new OutreachCsvParser();

  const authenticateUserUseCase = new AuthenticateUserUseCase(identityProvider, userAccessPolicy);

  return {
    auth: {
      authenticateUserUseCase,
      getUserSessionUseCase: new GetUserSessionUseCase(identityProvider, userAccessPolicy),
      loginUserUseCase: new LoginUserUseCase(
        {
          verifyPayload(payload: string) {
            return verifyAltchaPayload(payload, config.getAltchaVerificationSettings());
          },
        },
        identityProvider,
        {
          config: config.getLoginRateLimitConfig(),
          store: new SupabaseRateLimitStore(serviceClient, 'hit_admin_rate_limit'),
        },
        userAccessPolicy
      ),
      refreshUserSessionUseCase: new RefreshUserSessionUseCase(identityProvider, userAccessPolicy),
      secureCookies: config.getSecureCookies(),
      signOutUserUseCase: new SignOutUserUseCase(identityProvider),
    },
    users: {
      updateUserUseCase: new UpdateUserUseCase(identityProvider),
    },
    outreach: {
      createOutreachCsvUseCase: new CreateOutreachCsvUseCase(csvParser, outreachRepository),
      getOutreachChartUseCase: new GetOutreachChartUseCase(outreachRepository, systemClock),
      getOutreachSummaryUseCase: new GetOutreachSummaryUseCase(outreachRepository),
      importOutreachCsvUseCase: new ImportOutreachCsvUseCase(systemClock, csvParser, outreachRepository),
      listOutreachRecordsUseCase: new ListOutreachRecordsUseCase(outreachRepository),
      updateOutreachRecordUseCase: new UpdateOutreachRecordUseCase(
        new SupabaseOutreachAuditRepository(serviceClient, config),
        outreachRepository
      ),
    },
    visits: {
      deleteOldVisitSessionsUseCase: new DeleteOldVisitSessionsUseCase(visitRepository),
      listVisitJourneyUseCase: new ListVisitJourneyUseCase(visitRepository),
      listVisitMetricsUseCase: new ListVisitMetricsUseCase(visitRepository),
      listVisitSessionsUseCase: new ListVisitSessionsUseCase(visitRepository),
      recordVisitSessionUseCase: new RecordVisitSessionUseCase(
        config,
        new SupabaseGeolocationProvider(serviceClient),
        visitRepository,
        {
          config: config.getVisitLogRateLimitConfig(),
          store: new SupabaseRateLimitStore(serviceClient, 'hit_admin_rate_limit'),
        }
      ),
    },
    assistantConversations: {
      deleteAssistantConversationUseCase: new DeleteAssistantConversationUseCase(conversationRepository),
      deleteOldAssistantConversationsUseCase: new DeleteOldAssistantConversationsUseCase(
        conversationRepository
      ),
      getAssistantConversationUseCase: new GetAssistantConversationUseCase(conversationRepository),
      listAssistantConversationsUseCase: new ListAssistantConversationsUseCase(conversationRepository),
      logAssistantConversationUseCase: new LogAssistantConversationUseCase(conversationRepository, {
        config: config.getAssistantConversationLogRateLimitConfig(),
        store: new SupabaseRateLimitStore(serviceClient, 'hit_admin_rate_limit'),
      }),
    },
    maintenance: {
      supabase: serviceClient,
      tableName: 'outreach_records',
    },
  };
}
