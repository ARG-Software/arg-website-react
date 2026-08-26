import { routeAssistantConversationRequest } from '../../src/backend/admin/apps/api/api.ts';

export const config = {
  path: ['/api/admin/assistant-conversations', '/api/admin/assistant-conversation'],
  method: ['GET', 'DELETE', 'OPTIONS'],
};

export default routeAssistantConversationRequest;
