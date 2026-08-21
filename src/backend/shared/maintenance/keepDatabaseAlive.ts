import type { SupabaseClient } from '@supabase/supabase-js';

interface KeepDatabaseAliveDependencies {
  supabase: SupabaseClient;
  tableName: string;
  select?: string;
}

export async function keepDatabaseAlive({
  supabase,
  tableName,
  select = 'id',
}: KeepDatabaseAliveDependencies): Promise<void> {
  if (!supabase || !tableName) {
    throw new Error('Missing keep-alive dependencies');
  }

  const { error } = await supabase.from(tableName).select(select).limit(1);

  if (error) {
    throw error;
  }
}

export async function keepDatabasesAlive(databases: KeepDatabaseAliveDependencies[]): Promise<void> {
  await Promise.all(databases.map(database => keepDatabaseAlive(database)));
}
