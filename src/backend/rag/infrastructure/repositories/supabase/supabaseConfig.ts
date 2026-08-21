import { getRequiredEnv, type EnvSource } from '../../../config/env.js';

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
}

export function getSupabaseConfig(env: EnvSource = process.env): SupabaseConfig {
  return {
    supabaseUrl: getRequiredEnv('RAG_DATABASE_URL', env),
    supabaseServiceRoleKey: getRequiredEnv('RAG_DATABASE_SERVICE_ROLE_KEY', env),
  };
}
