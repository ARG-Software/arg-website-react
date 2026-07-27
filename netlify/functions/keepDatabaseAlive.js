import { createSupabaseServiceClient } from '../../rag/clients/supabaseClient.ts';

export default async () => {
  const startedAt = Date.now();
  const supabase = createSupabaseServiceClient();

  const { error } = await supabase.from('rag_sources').select('id').limit(1);

  if (error) {
    console.error('Database keepalive failed:', error.message);
    throw error;
  }

  console.log('Database keepalive completed', {
    durationMs: Date.now() - startedAt,
  });
};

export const config = {
  schedule: '0 9 */3 * *',
};
