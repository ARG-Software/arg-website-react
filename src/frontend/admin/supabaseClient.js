import { createClient } from '@supabase/supabase-js';

let browserClient;

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    const supabaseUrl = import.meta.env.VITE_ADMIN_DATABASE_URL;
    const anonKey = import.meta.env.VITE_ADMIN_DATABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      throw new Error('Missing VITE_ADMIN_DATABASE_URL or VITE_ADMIN_DATABASE_ANON_KEY');
    }

    browserClient = createClient(supabaseUrl, anonKey);
  }

  return browserClient;
}
