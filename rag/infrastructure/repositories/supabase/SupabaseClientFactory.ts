import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseConfig, type SupabaseConfig } from './supabaseConfig.js';

export function createSupabaseServiceClient(
  config: SupabaseConfig = getSupabaseConfig()
): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
