import type { SupabaseClient } from '@supabase/supabase-js';

export async function keepDatabaseAlive({ supabase }: { supabase: SupabaseClient }) {
  const { error } = await supabase.from('rag_sources').select('id').limit(1);

  if (error) {
    throw error;
  }
}
