import { createAdminDependencies } from './di/createAdminDependencies.js';

const RETENTION_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

export function createAssistantConversationsRetentionApi({
  createDependencies = createAdminDependencies,
  env = process.env,
} = {}) {
  return async function handleAssistantConversationsRetention() {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * DAY_MS).toISOString();
    const dependencies = createDependencies({
      env,
    }).createAssistantConversationRetentionDependencies();
    const deleted = await dependencies.conversationRepository.deleteOlderThan(cutoff);

    console.log('Assistant conversation retention completed', {
      cutoff,
      deleted,
    });
  };
}

export const handleAssistantConversationsRetention = createAssistantConversationsRetentionApi();

export const config = {
  schedule: '0 3 * * *',
};
