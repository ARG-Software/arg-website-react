import type { IMaintenanceConfiguration } from '../../application/config/IMaintenanceConfiguration.js';
import { createMaintenanceError } from '../../application/errors.js';

export interface IMaintenanceConfigValues {
  adminDatabaseUrl: string;
  adminDatabaseServiceRoleKey: string;
  ragDatabaseUrl: string;
  ragDatabaseServiceRoleKey: string;
}

export class MaintenanceConfig implements IMaintenanceConfiguration {
  private static instance: MaintenanceConfig | null = null;

  private values: IMaintenanceConfigValues;

  private constructor(values: IMaintenanceConfigValues) {
    this.values = { ...values };
  }

  static load(env: NodeJS.ProcessEnv = process.env): MaintenanceConfig {
    if (!MaintenanceConfig.instance) {
      MaintenanceConfig.instance = new MaintenanceConfig(readMaintenanceConfigValues(env));
    }

    return MaintenanceConfig.instance;
  }

  static configure(values: IMaintenanceConfigValues): MaintenanceConfig {
    if (!MaintenanceConfig.instance) {
      MaintenanceConfig.instance = new MaintenanceConfig(values);
      return MaintenanceConfig.instance;
    }

    MaintenanceConfig.instance.setValues(values);
    return MaintenanceConfig.instance;
  }

  static reset(): void {
    MaintenanceConfig.instance = null;
  }

  setValues(values: IMaintenanceConfigValues): void {
    this.values = { ...values };
  }

  getAdminDatabaseUrl(): string {
    return this.values.adminDatabaseUrl;
  }

  getAdminDatabaseServiceRoleKey(): string {
    return this.values.adminDatabaseServiceRoleKey;
  }

  getRagDatabaseUrl(): string {
    return this.values.ragDatabaseUrl;
  }

  getRagDatabaseServiceRoleKey(): string {
    return this.values.ragDatabaseServiceRoleKey;
  }
}

export function readMaintenanceConfigValues(env: NodeJS.ProcessEnv): IMaintenanceConfigValues {
  return {
    adminDatabaseUrl: requiredEnv(env, 'ADMIN_DATABASE_URL'),
    adminDatabaseServiceRoleKey: requiredEnv(env, 'ADMIN_DATABASE_SERVICE_ROLE_KEY'),
    ragDatabaseUrl: requiredEnv(env, 'RAG_DATABASE_URL'),
    ragDatabaseServiceRoleKey: requiredEnv(env, 'RAG_DATABASE_SERVICE_ROLE_KEY'),
  };
}

function requiredEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];

  if (!value) {
    throw createMaintenanceError(
      503,
      'configuration_error',
      `Missing required environment variable: ${name}`
    );
  }

  return value;
}
