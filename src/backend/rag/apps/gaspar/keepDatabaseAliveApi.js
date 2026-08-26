import { keepDatabasesAlive } from '../../../shared/maintenance/keepDatabaseAlive.js';
import { adminContainer } from '../../../admin/apps/di/adminContainer.ts';
import { createGasparDependencies } from '../di/createGasparDependencies.ts';
import { getRagConfig } from '../../application/ragConfig.ts';

export function createKeepDatabaseAliveApi({
  createDependencies = createGasparDependencies,
  env = process.env,
} = {}) {
  let ragConfig;

  function getRagAppConfig() {
    ragConfig ||= createDependencies === createGasparDependencies ? getRagConfig(env) : undefined;
    return ragConfig;
  }

  return async function handleKeepDatabaseAlive() {
    const startedAt = Date.now();
    const gasparDependencies = createDependencies({
      config: getRagAppConfig(),
    }).createMaintenanceDependencies();

    await keepDatabasesAlive([
      {
        ...gasparDependencies,
        tableName: 'rag_sources',
      },
      adminContainer.maintenance,
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
