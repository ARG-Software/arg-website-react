import { runSocialPostsSync } from '../../src/backend/maintenance/apps/api/api.ts';

export const config = {
  schedule: '0 9 1,15 * *',
};

export default runSocialPostsSync;
