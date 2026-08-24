import { AdminConfig } from './AdminConfig.js';
import type { IEnvSource } from '../../../shared/config/IEnvSource.js';

export function resolveAdminConfig({
  adminConfig,
  createDependencies,
  defaultCreateDependencies,
  env = process.env,
}: {
  adminConfig?: AdminConfig;
  createDependencies: unknown;
  defaultCreateDependencies: unknown;
  env?: IEnvSource;
}) {
  if (adminConfig) return adminConfig;

  return createDependencies === defaultCreateDependencies ? AdminConfig.load(env) : undefined;
}
