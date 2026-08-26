import { routeVisitRequest } from '../../src/backend/admin/apps/api/api.ts';

export const config = {
  path: '/api/visit-log',
  method: ['POST', 'OPTIONS'],
};

export default routeVisitRequest;
