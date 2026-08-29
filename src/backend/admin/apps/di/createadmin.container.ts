import { createClient } from '@supabase/supabase-js';

import { ConsoleLogger } from '../../../shared/logger/console.logger.js';
import { SupabaseRateLimitRepository } from '../../../shared/infrastructure/repositories/supabase/supabaseratelimit.repository.js';
import { RateLimiter } from '../../../shared/security/ratelimit.js';
import { AuthenticateUserUseCase } from '../../application/usecases/sessions/authenticateuser.usecase.js';
import { CreateOutreachCsvUseCase } from '../../application/usecases/outreach/createoutreachcsv.usecase.js';
import { DeleteAssistantConversationUseCase } from '../../application/usecases/assistantConversations/deleteassistantconversation.usecase.js';
import { DeleteVisitSessionUseCase } from '../../application/usecases/visits/deletevisitsession.usecase.js';
import { GetAssistantConversationUseCase } from '../../application/usecases/assistantConversations/getassistantconversation.usecase.js';
import { GetOutreachChartUseCase } from '../../application/usecases/outreach/getoutreachchart.usecase.js';
import { GetOutreachRecordUseCase } from '../../application/usecases/outreach/getoutreachrecord.usecase.js';
import { GetOutreachSummaryUseCase } from '../../application/usecases/outreach/getoutreachsummary.usecase.js';
import { GetUserSessionUseCase } from '../../application/usecases/sessions/getusersession.usecase.js';
import { ImportOutreachCsvUseCase } from '../../application/usecases/outreach/importoutreachcsv.usecase.js';
import { ListAssistantConversationsUseCase } from '../../application/usecases/assistantConversations/listassistantconversations.usecase.js';
import { ListAllVisitSessionsUseCase } from '../../application/usecases/visits/listallvisitsessions.usecase.js';
import { ListOutreachRecordsUseCase } from '../../application/usecases/outreach/listoutreachrecords.usecase.js';
import { ListVisitCountryBreakdownUseCase } from '../../application/usecases/visits/listvisitcountrybreakdown.usecase.js';
import { ListVisitJourneyUseCase } from '../../application/usecases/visits/listvisitjourney.usecase.js';
import { ListVisitMetricsUseCase } from '../../application/usecases/visits/listvisitmetrics.usecase.js';
import { ListVisitSessionsUseCase } from '../../application/usecases/visits/listvisitsessions.usecase.js';
import { LogAssistantConversationUseCase } from '../../application/usecases/assistantConversations/logassistantconversation.usecase.js';
import { LoginUserUseCase } from '../../application/usecases/sessions/loginuser.usecase.js';
import { RecordVisitSessionUseCase } from '../../application/usecases/visits/recordvisitsession.usecase.js';
import { RefreshUserSessionUseCase } from '../../application/usecases/sessions/refreshusersession.usecase.js';
import { SignOutUserUseCase } from '../../application/usecases/sessions/signoutuser.usecase.js';
import { UpdateOutreachRecordUseCase } from '../../application/usecases/outreach/updateoutreachrecord.usecase.js';
import { UpdateUserUseCase } from '../../application/usecases/users/updateuser.usecase.js';
import { createUserAccessPolicy } from '../../application/policies/useraccess.policy.js';
import { OutreachCsvParser } from '../../infrastructure/csv/outreachcsv.parser.js';
import { SupabaseAdminUserRepository } from '../../infrastructure/repositories/supabase/supabaseadminuser.repository.js';
import { SupabaseAssistantConversationRepository } from '../../infrastructure/repositories/supabase/supabaseassistantconversation.repository.js';
import { SupabaseOutreachAuditRepository } from '../../infrastructure/repositories/supabase/supabaseoutreachaudit.repository.js';
import { SupabaseOutreachRepository } from '../../infrastructure/repositories/supabase/supabaseoutreach.repository.js';
import { SupabaseUserIdentityProvider } from '../../infrastructure/repositories/supabase/supabaseuseridentity.provider.js';
import { SupabaseVisitRepository } from '../../infrastructure/repositories/supabase/supabasevisit.repository.js';
import { systemClock } from '../../infrastructure/system/systemclock.js';
import { DiscordWebhookProvider } from '../../infrastructure/webhooks/discordwebhook.provider.js';
import { AdminConfig } from '../config/admin.config.js';

export function createAdminContainer() {
  const logger = new ConsoleLogger();
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
  const userAccessPolicy = createUserAccessPolicy(adminUserRepository, logger);
  const identityProvider = new SupabaseUserIdentityProvider(authClient, logger);
  const conversationRepository = new SupabaseAssistantConversationRepository(serviceClient, config);
  const outreachRepository = new SupabaseOutreachRepository(serviceClient, config);
  const visitRepository = new SupabaseVisitRepository(serviceClient);
  const adminRateLimitRepository = new SupabaseRateLimitRepository(
    serviceClient,
    'hit_admin_rate_limit',
    logger
  );
  const csvParser = new OutreachCsvParser();
  const notificationWebhook = config.getNotificationWebhookUrl()
    ? new DiscordWebhookProvider(config.getNotificationWebhookUrl(), logger)
    : { send: async () => {} };

  const authenticateUserUseCase = new AuthenticateUserUseCase(identityProvider, userAccessPolicy);

  return {
    auth: {
      authenticateUserUseCase,
      getUserSessionUseCase: new GetUserSessionUseCase(identityProvider, userAccessPolicy),
      loginUserUseCase: new LoginUserUseCase(
        identityProvider,
        userAccessPolicy
      ),
      loginRateLimiter: new RateLimiter(adminRateLimitRepository, config.getLoginRateLimitConfig()),
      refreshUserSessionUseCase: new RefreshUserSessionUseCase(identityProvider, userAccessPolicy),
      altchaSettings: config.getAltchaSettings(),
      secureCookies: config.getSecureCookies(),
      signOutUserUseCase: new SignOutUserUseCase(identityProvider),
    },
    users: {
      updateUserUseCase: new UpdateUserUseCase(identityProvider),
    },
    outreach: {
      createOutreachCsvUseCase: new CreateOutreachCsvUseCase(csvParser, outreachRepository),
      getOutreachChartUseCase: new GetOutreachChartUseCase(outreachRepository, systemClock),
      getOutreachRecordUseCase: new GetOutreachRecordUseCase(outreachRepository),
      getOutreachSummaryUseCase: new GetOutreachSummaryUseCase(outreachRepository),
      importOutreachCsvUseCase: new ImportOutreachCsvUseCase(
        systemClock,
        csvParser,
        outreachRepository
      ),
      listOutreachRecordsUseCase: new ListOutreachRecordsUseCase(outreachRepository),
      updateOutreachRecordUseCase: new UpdateOutreachRecordUseCase(
        new SupabaseOutreachAuditRepository(serviceClient, config, logger),
        outreachRepository
      ),
    },
    visits: {
      deleteVisitSessionUseCase: new DeleteVisitSessionUseCase(visitRepository),
      listAllVisitSessionsUseCase: new ListAllVisitSessionsUseCase(visitRepository),
      listVisitCountryBreakdownUseCase: new ListVisitCountryBreakdownUseCase(visitRepository),
      listVisitJourneyUseCase: new ListVisitJourneyUseCase(visitRepository),
      listVisitMetricsUseCase: new ListVisitMetricsUseCase(visitRepository),
      listVisitSessionsUseCase: new ListVisitSessionsUseCase(visitRepository),
      recordVisitSessionUseCase: new RecordVisitSessionUseCase(
        config,
        visitRepository
      ),
      visitLogRateLimiter: new RateLimiter(adminRateLimitRepository, config.getVisitLogRateLimitConfig()),
    },
    assistantConversations: {
      deleteAssistantConversationUseCase: new DeleteAssistantConversationUseCase(
        conversationRepository
      ),
      getAssistantConversationUseCase: new GetAssistantConversationUseCase(conversationRepository),
      listAssistantConversationsUseCase: new ListAssistantConversationsUseCase(
        conversationRepository
      ),
      logAssistantConversationUseCase: new LogAssistantConversationUseCase(
        conversationRepository,
        notificationWebhook,
        config.getAdminSiteUrl(),
        logger
      ),
      conversationLogRateLimiter: new RateLimiter(
        adminRateLimitRepository,
        config.getAssistantConversationLogRateLimitConfig()
      ),
    },
    loginRateLimitNotifier: notificationWebhook,
    logger,
  };
}
