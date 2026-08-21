import { createClient } from '@supabase/supabase-js';

export function createSupabaseAdminClient(config) {
  return createClient(config.databaseUrl, config.databaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function createSupabaseAdminAuthClient(config) {
  return createClient(config.databaseUrl, config.databaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
