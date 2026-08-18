import { createGasparMaintenanceApp } from '../apps/gaspar/createGasparMaintenanceApp.ts';

export function createKeepDatabaseAliveApi({ env = process.env, maintenanceApp } = {}) {
  return async function handleKeepDatabaseAlive() {
    const startedAt = Date.now();
    await getMaintenanceApp().keepDatabaseAlive();

    console.log('Database keepalive completed', {
      durationMs: Date.now() - startedAt,
    });
  };

  function getMaintenanceApp() {
    return maintenanceApp || createGasparMaintenanceApp({ env });
  }
}

export const handleKeepDatabaseAlive = createKeepDatabaseAliveApi();

export const config = {
  schedule: '0 9 */3 * *',
};
