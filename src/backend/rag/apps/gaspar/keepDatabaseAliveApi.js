import { keepDatabasesAlive } from '../../../shared/maintenance/keepDatabaseAlive.js';
import { createAdminDependencies } from '../../../admin/apps/di/createAdminDependencies.js';
import { createGasparDependencies } from '../di/createGasparDependencies.ts';

export function createKeepDatabaseAliveApi({
  createDependencies = createGasparDependencies,
  createAdminDependencyFactory = createAdminDependencies,
  env = process.env,
} = {}) {
  return async function handleKeepDatabaseAlive() {
    const startedAt = Date.now();
    const gasparDependencies = createDependencies({ env }).createMaintenanceDependencies();
    const adminDependencies = createAdminDependencyFactory({ env }).createMaintenanceDependencies();

    await keepDatabasesAlive([
      {
        ...gasparDependencies,
        tableName: 'rag_sources',
      },
      adminDependencies,
    ]);

    console.log('Database keepalive completed', {
      databases: ['rag', 'admin'],
      durationMs: Date.now() - startedAt,
    });
  };
}

export const handleKeepDatabaseAlive = createKeepDatabaseAliveApi();

export const config = {
  schedule: '0 9 */3 * *',
};
