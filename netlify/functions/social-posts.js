import { routeSocialPostRequest } from '../../src/backend/admin/apps/api/api.ts';

export const config = {
  path: '/api/social-posts',
  method: ['GET', 'OPTIONS'],
};

export default routeSocialPostRequest;
