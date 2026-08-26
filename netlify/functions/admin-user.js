import { routeUserRequest } from '../../src/backend/admin/apps/api/api.ts';

export const config = {
  path: '/api/admin/user',
  method: ['PATCH', 'OPTIONS'],
};

export default routeUserRequest;
