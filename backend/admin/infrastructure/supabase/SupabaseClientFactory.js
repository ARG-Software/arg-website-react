import { createClient } from '@supabase/supabase-js';

let supabase;

export function createSupabaseAdminClient(config) {
  if (!supabase) {
    supabase = createClient(config.databaseUrl, config.databaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  return supabase;
}
