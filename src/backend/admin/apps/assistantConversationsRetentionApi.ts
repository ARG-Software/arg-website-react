import { createAdminDependencies } from './di/createAdminDependencies.js';
import { resolveAdminConfig } from './config/resolveAdminConfig.js';
import type { IAdminApiFactoryOptions } from './IAdminApiFactoryOptions.js';

const RETENTION_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

export function createAssistantConversationsRetentionApi({
  createDependencies = createAdminDependencies,
  adminConfig,
  env = process.env,
}: IAdminApiFactoryOptions = {}) {
  let appConfig = adminConfig;

  function getAppConfig() {
    appConfig ||= resolveAdminConfig({
      adminConfig,
      createDependencies,
      defaultCreateDependencies: createAdminDependencies,
      env,
    });
    return appConfig;
  }

  return async function handleAssistantConversationsRetention() {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * DAY_MS).toISOString();
    const dependencies = createDependencies({
      config: getAppConfig(),
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
