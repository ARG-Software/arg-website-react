import { keepDatabaseAlive } from '../../application/maintenance/keepDatabaseAlive.ts';
import { createGasparDependencies } from '../di/createGasparDependencies.ts';

export function createKeepDatabaseAliveApi({
  createDependencies = createGasparDependencies,
  env = process.env,
} = {}) {
  return async function handleKeepDatabaseAlive() {
    const startedAt = Date.now();
    await keepDatabaseAlive(createDependencies({ env }).createMaintenanceDependencies());

    console.log('Database keepalive completed', {
      durationMs: Date.now() - startedAt,
    });
  };
}

export const handleKeepDatabaseAlive = createKeepDatabaseAliveApi();

export const config = {
  schedule: '0 9 */3 * *',
};
