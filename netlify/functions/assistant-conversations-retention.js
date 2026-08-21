import {
  config,
  createAssistantConversationsRetentionApi,
} from '../../src/backend/admin/apps/assistantConversationsRetentionApi.js';

export { config };

export default createAssistantConversationsRetentionApi({ env: process.env });
