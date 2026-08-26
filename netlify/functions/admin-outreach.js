import { routeOutreachRequest } from '../../src/backend/admin/apps/api/api.ts';

export const config = {
  path: [
    '/api/admin/outreach-records',
    '/api/admin/outreach-summary',
    '/api/admin/outreach-chart',
    '/api/admin/outreach-export',
    '/api/admin/outreach-import',
    '/api/admin/outreach-record',
  ],
  method: ['GET', 'POST', 'PATCH', 'OPTIONS'],
};

export default routeOutreachRequest;
