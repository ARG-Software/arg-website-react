import { keepDatabaseAlive as keepSharedDatabaseAlive } from '../../../shared/maintenance/keepDatabaseAlive.js';

type RagKeepAliveDependencies = Omit<Parameters<typeof keepSharedDatabaseAlive>[0], 'tableName'>;

export async function keepDatabaseAlive(dependencies: RagKeepAliveDependencies) {
  await keepSharedDatabaseAlive({ ...dependencies, tableName: 'rag_sources' });
}
