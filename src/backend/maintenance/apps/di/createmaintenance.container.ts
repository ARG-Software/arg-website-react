import { createClient } from '@supabase/supabase-js';

import { ConsoleLogger } from '../../../shared/logger/console.logger.js';
import { MaintenanceConfig } from '../config/maintenance.config.js';
import { DeleteOldAssistantConversationsUseCase } from '../../application/usecases/deleteoldassistantconversations.usecase.js';
import { DeleteOldVisitSessionsUseCase } from '../../application/usecases/deleteoldvisitsessions.usecase.js';
import { KeepDatabasesAliveUseCase } from '../../application/usecases/keepdatabasesalive.usecase.js';
import { SupabaseMaintenanceRepository } from '../../infrastructure/repositories/supabase/supabasemaintenance.repository.js';

export function createMaintenanceContainer() {
  const logger = new ConsoleLogger();
  const config = MaintenanceConfig.load();
  const adminClient = createClient(config.getAdminDatabaseUrl(), config.getAdminDatabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const ragClient = createClient(config.getRagDatabaseUrl(), config.getRagDatabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const maintenanceRepository = new SupabaseMaintenanceRepository(adminClient, ragClient, logger);

  return {
    deleteOldAssistantConversationsUseCase: new DeleteOldAssistantConversationsUseCase(
      maintenanceRepository
    ),
    deleteOldVisitSessionsUseCase: new DeleteOldVisitSessionsUseCase(maintenanceRepository),
    keepDatabasesAliveUseCase: new KeepDatabasesAliveUseCase(maintenanceRepository),
    logger,
  };
}
