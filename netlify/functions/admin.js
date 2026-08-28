import { routeAdminRequest } from '../../src/backend/admin/apps/api/api.ts';

export const config = {
  path: [
    '/api/admin/login',
    '/api/admin/session',
    '/api/admin/user',
    '/api/admin/outreach-records',
    '/api/admin/outreach-summary',
    '/api/admin/outreach-chart',
    '/api/admin/outreach-export',
    '/api/admin/outreach-import',
    '/api/admin/outreach-record',
    '/api/admin/visit-metrics',
    '/api/admin/visit-sessions',
    '/api/admin/visit-session',
    '/api/admin/visit-journey',
    '/api/admin/assistant-conversations',
    '/api/admin/assistant-conversation',
  ],
  method: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
};

export default routeAdminRequest;
