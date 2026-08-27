import { runRetentionCleanup } from '../../src/backend/maintenance/apps/api/api.ts';

export const config = {
  schedule: '0 3 1 */3 *',
};

export default runRetentionCleanup;
