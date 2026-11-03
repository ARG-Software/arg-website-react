import { routeArchitectReleaseRequest } from '../../src/backend/admin/apps/api/api.ts';

export const config = {
  path: '/api/architect-releases',
  method: ['GET', 'OPTIONS'],
};

export default routeArchitectReleaseRequest;
