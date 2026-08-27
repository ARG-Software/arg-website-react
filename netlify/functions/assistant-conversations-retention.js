import { runAssistantConversationsRetention } from '../../src/backend/maintenance/apps/api/api.ts';

export const config = {
  schedule: '0 3 * * *',
};

export default runAssistantConversationsRetention;
