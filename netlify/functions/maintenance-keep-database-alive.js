import { runKeepDatabaseAlive } from '../../src/backend/maintenance/apps/api/api.ts';

export const config = {
  schedule: '0 9 */3 * *',
};

export default runKeepDatabaseAlive;
