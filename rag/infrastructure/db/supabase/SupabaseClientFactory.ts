import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseConfig } from '../../../config/env.js';
import type { RagConfig } from '../../../config/RagConfig.js';

export function createSupabaseServiceClient(
  config: Pick<RagConfig, 'supabaseUrl' | 'supabaseServiceRoleKey'> = getSupabaseConfig()
): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
