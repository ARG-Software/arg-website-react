import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { IRagConfig } from '../../../application/ragConfig.js';

export function createSupabaseServiceClient(
  config: Pick<IRagConfig, 'databaseUrl' | 'databaseServiceRoleKey'>
): SupabaseClient {
  return createClient(config.databaseUrl, config.databaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
