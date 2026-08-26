import { routeAuthRequest } from '../../src/backend/admin/apps/api/api.ts';

export const config = {
  path: ['/api/admin/login', '/api/admin/session'],
  method: ['GET', 'POST', 'DELETE', 'OPTIONS'],
};

export default routeAuthRequest;
