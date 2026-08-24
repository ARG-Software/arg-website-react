import { createAdminDependencies } from './di/createAdminDependencies.js';
import { resolveAdminConfig } from './config/resolveAdminConfig.js';
import type { IAdminApiFactoryOptions } from './IAdminApiFactoryOptions.js';

const RETENTION_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

export function createVisitRetentionApi({
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

  return async function handleVisitRetention() {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * DAY_MS).toISOString();
    const dependencies = createDependencies({ config: getAppConfig() }).createVisitRetentionDependencies();
    const deleted = await dependencies.visitRepository.deleteOlderThan(cutoff);

    console.log('Visit analytics retention completed', {
      cutoff,
      deleted,
    });
  };
}

export const handleVisitRetention = createVisitRetentionApi();

export const config = {
  schedule: '0 4 * * *',
};
