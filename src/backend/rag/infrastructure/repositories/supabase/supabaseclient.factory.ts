import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

interface SupabaseServiceConfig {
  databaseUrl: string;
  databaseServiceRoleKey: string;
}

export function createSupabaseServiceClient(config: SupabaseServiceConfig): SupabaseClient {
  return createClient(config.databaseUrl, config.databaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
