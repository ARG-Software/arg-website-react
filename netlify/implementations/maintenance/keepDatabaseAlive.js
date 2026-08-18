import { createGasparMaintenanceApp } from '../../../rag/apps/gaspar/createGasparMaintenanceApp.ts';

export async function handleKeepDatabaseAlive() {
  const startedAt = Date.now();
  await createGasparMaintenanceApp().keepDatabaseAlive();

  console.log('Database keepalive completed', {
    durationMs: Date.now() - startedAt,
  });
}

export const config = {
  schedule: '0 9 */3 * *',
};
