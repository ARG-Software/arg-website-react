import { createClient } from '@supabase/supabase-js';

import { getSupabaseConfig } from '../config/env.js';

export function createSupabaseServiceClient(config = getSupabaseConfig()) {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
