import { getRequiredEnv } from '../../../config/env.js';

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
}

export function getSupabaseConfig(): SupabaseConfig {
  return {
    supabaseUrl: getRequiredEnv('DATABASE_URL'),
    supabaseServiceRoleKey: getRequiredEnv('DATABASE_SERVICE_ROLE_KEY'),
  };
}
