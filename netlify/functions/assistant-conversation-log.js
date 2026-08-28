import { routeAssistantConversationRequest } from '../../src/backend/admin/apps/api/api.ts';

export const config = {
  path: '/api/admin/assistant-conversation-log',
  method: ['POST', 'OPTIONS'],
  rateLimit: {
    windowLimit: 20,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};

export default routeAssistantConversationRequest;
