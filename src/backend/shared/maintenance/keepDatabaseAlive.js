export async function keepDatabaseAlive({ supabase, tableName, select = 'id' }) {
  if (!supabase || !tableName) {
    throw new Error('Missing keep-alive dependencies');
  }

  const { error } = await supabase.from(tableName).select(select).limit(1);

  if (error) {
    throw error;
  }
}

export async function keepDatabasesAlive(databases) {
  await Promise.all(databases.map(database => keepDatabaseAlive(database)));
}
