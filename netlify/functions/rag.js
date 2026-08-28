import { routeRagRequest } from '../../src/backend/rag/apps/api/api.ts';

export const config = {
  path: [
    '/api/assistant/challenge',
    '/api/assistant/ask',
    '/api/assistant/ui-copy',
    '/api/security/challenge',
    '/api/security/verify',
  ],
  method: ['GET', 'POST', 'OPTIONS'],
  rateLimit: {
    windowLimit: 30,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};

export default routeRagRequest;
