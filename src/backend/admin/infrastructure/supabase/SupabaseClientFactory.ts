import { createClient } from '@supabase/supabase-js';
import type { AdminConfig } from '../../apps/config/AdminConfig.js';

export function createSupabaseAdminClient(config: AdminConfig) {
  return createClient(config.getAdminDatabaseUrl(), config.getAdminDatabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function createSupabaseAdminAuthClient(config: AdminConfig) {
  return createClient(config.getAdminDatabaseUrl(), config.getAdminDatabaseAnonKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
