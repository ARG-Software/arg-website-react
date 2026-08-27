import { createClient } from '@supabase/supabase-js';

import { MaintenanceConfig } from '../config/MaintenanceConfig.js';
import { DeleteOldAssistantConversationsUseCase } from '../../application/usecases/deleteOldAssistantConversationsUseCase.js';
import { DeleteOldVisitSessionsUseCase } from '../../application/usecases/deleteOldVisitSessionsUseCase.js';
import { KeepDatabasesAliveUseCase } from '../../application/usecases/keepDatabasesAliveUseCase.js';
import { SupabaseMaintenanceRepository } from '../../infrastructure/repositories/supabase/SupabaseMaintenanceRepository.js';

export function createMaintenanceContainer() {
  const config = MaintenanceConfig.load();
  const adminClient = createClient(config.getAdminDatabaseUrl(), config.getAdminDatabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const ragClient = createClient(config.getRagDatabaseUrl(), config.getRagDatabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const maintenanceRepository = new SupabaseMaintenanceRepository(adminClient, ragClient);

  return {
    deleteOldAssistantConversationsUseCase: new DeleteOldAssistantConversationsUseCase(
      maintenanceRepository
    ),
    deleteOldVisitSessionsUseCase: new DeleteOldVisitSessionsUseCase(maintenanceRepository),
    keepDatabasesAliveUseCase: new KeepDatabasesAliveUseCase(maintenanceRepository),
  };
}
