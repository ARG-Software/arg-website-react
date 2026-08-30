import { createClient } from '@supabase/supabase-js';

import { ConsoleLogger } from '../../../shared/logger/console.logger.js';
import { MaintenanceConfig } from '../config/maintenance.config.js';
import { DeleteOldAssistantConversationsUseCase } from '../../application/usecases/deleteoldassistantconversations.usecase.js';
import { DeleteOldVisitSessionsUseCase } from '../../application/usecases/deleteoldvisitsessions.usecase.js';
import { KeepDatabasesAliveUseCase } from '../../application/usecases/keepdatabasesalive.usecase.js';
import { SupabaseVisitSessionRepository } from '../../../admin/infrastructure/repositories/supabase/supabasevisitsession.repository.js';
import { SupabaseAssistantConversationRetentionRepository } from '../../infrastructure/repositories/supabase/supabaseassistantconversationretention.repository.js';
import { SupabaseTableKeepAliveProbe } from '../../infrastructure/repositories/supabase/supabasetablekeepaliveprobe.js';

export function createMaintenanceContainer() {
  const logger = new ConsoleLogger();
  const config = MaintenanceConfig.load();
  const adminClient = createClient(config.getAdminDatabaseUrl(), config.getAdminDatabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const ragClient = createClient(config.getRagDatabaseUrl(), config.getRagDatabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const assistantConversationRetentionRepository = new SupabaseAssistantConversationRetentionRepository(
    adminClient,
    logger
  );
  const visitSessionRepository = new SupabaseVisitSessionRepository(adminClient, logger);

  return {
    deleteOldAssistantConversationsUseCase: new DeleteOldAssistantConversationsUseCase(
      assistantConversationRetentionRepository
    ),
    deleteOldVisitSessionsUseCase: new DeleteOldVisitSessionsUseCase(visitSessionRepository),
    keepDatabasesAliveUseCase: new KeepDatabasesAliveUseCase([
      new SupabaseTableKeepAliveProbe(ragClient, 'rag_sources', logger),
      new SupabaseTableKeepAliveProbe(adminClient, 'outreach_records', logger),
    ]),
    logger,
  };
}
