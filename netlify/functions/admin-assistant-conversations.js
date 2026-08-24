import {
  config,
  createAdminAssistantConversationsApi,
} from '../../src/backend/admin/apps/adminAssistantConversationsApi.ts';

export { config };

export default createAdminAssistantConversationsApi({ env: process.env });
