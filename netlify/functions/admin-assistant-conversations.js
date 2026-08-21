import {
  config,
  createAdminAssistantConversationsApi,
} from '../../src/backend/admin/apps/adminAssistantConversationsApi.js';

export { config };

export default createAdminAssistantConversationsApi({ env: process.env });
