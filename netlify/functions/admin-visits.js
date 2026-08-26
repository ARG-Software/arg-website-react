import { routeVisitRequest } from '../../src/backend/admin/apps/api/api.ts';

export const config = {
  path: ['/api/admin/visit-metrics', '/api/admin/visit-sessions', '/api/admin/visit-journey'],
  method: ['GET', 'OPTIONS'],
};

export default routeVisitRequest;
