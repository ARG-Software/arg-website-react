import {
  config,
  createAssistantConversationsRetentionApi,
} from '../../src/backend/admin/apps/assistantConversationsRetentionApi.ts';

export { config };

export default createAssistantConversationsRetentionApi({ env: process.env });
