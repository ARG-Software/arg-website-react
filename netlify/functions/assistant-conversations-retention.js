import { assistantConversationsRetention } from '../../src/backend/admin/apps/api/api.ts';

export const config = {
  schedule: '0 3 * * *',
};

export default assistantConversationsRetention;
