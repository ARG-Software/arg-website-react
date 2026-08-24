import type { IEnvSource } from '../../shared/config/IEnvSource.js';
import type { AdminConfig } from './config/AdminConfig.js';
import type { createAdminDependencies } from './di/createAdminDependencies.js';

export interface IAdminApiFactoryOptions {
  createDependencies?: typeof createAdminDependencies;
  adminConfig?: AdminConfig;
  env?: IEnvSource;
}
