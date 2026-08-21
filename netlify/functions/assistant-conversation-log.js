import {
  config,
  createAssistantConversationLogApi,
} from '../../src/backend/admin/apps/assistantConversationLogApi.js';

export { config };

export default createAssistantConversationLogApi({ env: process.env });
