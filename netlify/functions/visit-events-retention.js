import { visitRetention } from '../../src/backend/admin/apps/api/api.ts';

export const config = {
  schedule: '0 4 * * *',
};

export default visitRetention;
