import { keepDatabasesAlive } from '../../../shared/maintenance/keepDatabaseAlive.js';
import { createAdminDependencies } from '../../../admin/apps/di/createAdminDependencies.ts';
import { createGasparDependencies } from '../di/createGasparDependencies.ts';
import { getAdminConfig } from '../../../admin/infrastructure/config/adminConfig.ts';
import { getRagConfig } from '../../application/ragConfig.ts';

export function createKeepDatabaseAliveApi({
  createDependencies = createGasparDependencies,
  createAdminDependencyFactory = createAdminDependencies,
  env = process.env,
} = {}) {
  let adminConfig;
  let ragConfig;

  function getAdminAppConfig() {
    adminConfig ||=
      createAdminDependencyFactory === createAdminDependencies ? getAdminConfig(env) : undefined;
    return adminConfig;
  }

  function getRagAppConfig() {
    ragConfig ||= createDependencies === createGasparDependencies ? getRagConfig(env) : undefined;
    return ragConfig;
  }

  return async function handleKeepDatabaseAlive() {
    const startedAt = Date.now();
    const gasparDependencies = createDependencies({
      config: getRagAppConfig(),
    }).createMaintenanceDependencies();
    const adminDependencies = createAdminDependencyFactory({
      config: getAdminAppConfig(),
    }).createMaintenanceDependencies();

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
