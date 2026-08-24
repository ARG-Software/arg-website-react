import {
  config,
  createAssistantConversationLogApi,
} from '../../src/backend/admin/apps/assistantConversationLogApi.ts';

export { config };

export default createAssistantConversationLogApi({ env: process.env });
