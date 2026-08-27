import { createAdminError } from '../../application/errors.js';
import type { IAdminConfiguration } from '../../application/config/IAdminConfiguration.js';
import type { IRateLimitConfig } from '../../../shared/security/rateLimit.js';
import type { AltchaSettings } from '../../../shared/security/altcha.js';

const DEFAULT_LOGIN_RATE_LIMIT_SALT = 'arg-admin-login-rate-limit';
const DEFAULT_VISIT_LOG_RATE_LIMIT_SALT = 'arg-visit-log-rate-limit';
const DEFAULT_ASSISTANT_CONVERSATION_LOG_RATE_LIMIT_SALT =
  'arg-assistant-conversation-log-rate-limit';
const DEFAULT_VISIT_HASH_KEY = 'arg-visit-analytics-dev-key';

export interface IAdminConfigValues {
  adminDatabaseUrl: string;
  adminDatabaseAnonKey: string;
  adminDatabaseServiceRoleKey: string;
  auditSalt: string;
  loginRateLimitPerMinute: number;
  loginRateLimitPerDay: number;
  loginGlobalRateLimitPerDay: number;
  loginRateLimitSalt: string;
  visitLogRateLimitPerMinute: number;
  visitLogRateLimitPerDay: number;
  visitLogGlobalRateLimitPerDay: number;
  visitLogRateLimitSalt: string;
  assistantConversationLogRateLimitPerMinute: number;
  assistantConversationLogRateLimitPerDay: number;
  assistantConversationLogGlobalRateLimitPerDay: number;
  assistantConversationLogRateLimitSalt: string;
  altchaHmacKey: string;
  altchaCost: number;
  altchaCounterMin: number;
  altchaCounterMax: number;
  secureCookies: boolean;
  visitHashKey: string;
  outreachEncryptionKeyActiveVersion: number;
  outreachEncryptionKeys: Record<number, string>;
  outreachBlindIndexKey: string;
  assistantConversationEncryptionKeyActiveVersion: number;
  assistantConversationEncryptionKeys: Record<number, string>;
}

export class AdminConfig implements IAdminConfiguration {
  private static instance: AdminConfig | null = null;

  private values: IAdminConfigValues;

  private constructor(values: IAdminConfigValues) {
    this.values = { ...values };
  }

  static load(env: NodeJS.ProcessEnv = process.env): AdminConfig {
    if (!AdminConfig.instance) {
      AdminConfig.instance = new AdminConfig(readAdminConfigValues(env));
    }

    return AdminConfig.instance;
  }

  static configure(values: IAdminConfigValues): AdminConfig {
    if (!AdminConfig.instance) {
      AdminConfig.instance = new AdminConfig(values);
      return AdminConfig.instance;
    }

    AdminConfig.instance.setValues(values);
    return AdminConfig.instance;
  }

  static reset(): void {
    AdminConfig.instance = null;
  }

  setValues(values: IAdminConfigValues): void {
    this.values = { ...values };
  }

  getAdminDatabaseUrl(): string {
    return this.values.adminDatabaseUrl;
  }

  getAdminDatabaseAnonKey(): string {
    return this.values.adminDatabaseAnonKey;
  }

  getAdminDatabaseServiceRoleKey(): string {
    return this.values.adminDatabaseServiceRoleKey;
  }

  getAuditSalt(): string {
    return this.values.auditSalt;
  }

  getSecureCookies(): boolean {
    return this.values.secureCookies;
  }

  getVisitHashKey(): string {
    return this.values.visitHashKey;
  }

  getOutreachBlindIndexKey(): string {
    return this.values.outreachBlindIndexKey;
  }

  getActiveOutreachEncryptionKeyVersion(): number {
    return this.values.outreachEncryptionKeyActiveVersion;
  }

  getOutreachEncryptionKey(version: number): string {
    return this.values.outreachEncryptionKeys[version] || '';
  }

  getActiveAssistantConversationEncryptionKeyVersion(): number {
    return this.values.assistantConversationEncryptionKeyActiveVersion;
  }

  getAssistantConversationEncryptionKey(version: number): string {
    return this.values.assistantConversationEncryptionKeys[version] || '';
  }

  getAssistantConversationEncryptionKeys(): Record<number, string> {
    return { ...this.values.assistantConversationEncryptionKeys };
  }

  getLoginRateLimitConfig(): IRateLimitConfig {
    return {
      perMinute: this.values.loginRateLimitPerMinute,
      perDay: this.values.loginRateLimitPerDay,
      globalDaily: this.values.loginGlobalRateLimitPerDay,
      salt: this.values.loginRateLimitSalt,
    };
  }

  getVisitLogRateLimitConfig(): IRateLimitConfig {
    return {
      perMinute: this.values.visitLogRateLimitPerMinute,
      perDay: this.values.visitLogRateLimitPerDay,
      globalDaily: this.values.visitLogGlobalRateLimitPerDay,
      salt: this.values.visitLogRateLimitSalt,
    };
  }

  getAssistantConversationLogRateLimitConfig(): IRateLimitConfig {
    return {
      perMinute: this.values.assistantConversationLogRateLimitPerMinute,
      perDay: this.values.assistantConversationLogRateLimitPerDay,
      globalDaily: this.values.assistantConversationLogGlobalRateLimitPerDay,
      salt: this.values.assistantConversationLogRateLimitSalt,
    };
  }

  getAltchaSettings(): AltchaSettings {
    return {
      altchaHmacKey: this.values.altchaHmacKey,
      altchaCost: this.values.altchaCost,
      altchaCounterMin: this.values.altchaCounterMin,
      altchaCounterMax: this.values.altchaCounterMax,
    };
  }

}

export function readAdminConfigValues(env: NodeJS.ProcessEnv): IAdminConfigValues {
  const loginRateLimitSalt = env.ADMIN_LOGIN_RATE_LIMIT_SALT || DEFAULT_LOGIN_RATE_LIMIT_SALT;

  return {
    auditSalt: env.OUTREACH_AUDIT_SALT || 'outreach',
    adminDatabaseUrl: requiredEnv(env, 'ADMIN_DATABASE_URL'),
    adminDatabaseAnonKey: requiredEnv(env, 'ADMIN_DATABASE_ANON_KEY'),
    adminDatabaseServiceRoleKey: requiredEnv(env, 'ADMIN_DATABASE_SERVICE_ROLE_KEY'),
    loginRateLimitPerMinute: getPositiveNumberEnv(env, 'ADMIN_LOGIN_RATE_LIMIT_PER_MINUTE', 6),
    loginRateLimitPerDay: getPositiveNumberEnv(env, 'ADMIN_LOGIN_RATE_LIMIT_PER_DAY', 30),
    loginGlobalRateLimitPerDay: getPositiveNumberEnv(
      env,
      'ADMIN_LOGIN_GLOBAL_RATE_LIMIT_PER_DAY',
      500
    ),
    loginRateLimitSalt,
    visitLogRateLimitPerMinute: getPositiveNumberEnv(env, 'VISIT_LOG_RATE_LIMIT_PER_MINUTE', 6),
    visitLogRateLimitPerDay: getPositiveNumberEnv(env, 'VISIT_LOG_RATE_LIMIT_PER_DAY', 30),
    visitLogGlobalRateLimitPerDay: getPositiveNumberEnv(
      env,
      'VISIT_LOG_GLOBAL_RATE_LIMIT_PER_DAY',
      500
    ),
    visitLogRateLimitSalt: env.VISIT_LOG_RATE_LIMIT_SALT || DEFAULT_VISIT_LOG_RATE_LIMIT_SALT,
    assistantConversationLogRateLimitPerMinute: getPositiveNumberEnv(
      env,
      'ASSISTANT_CONVERSATION_LOG_RATE_LIMIT_PER_MINUTE',
      6
    ),
    assistantConversationLogRateLimitPerDay: getPositiveNumberEnv(
      env,
      'ASSISTANT_CONVERSATION_LOG_RATE_LIMIT_PER_DAY',
      30
    ),
    assistantConversationLogGlobalRateLimitPerDay: getPositiveNumberEnv(
      env,
      'ASSISTANT_CONVERSATION_LOG_GLOBAL_RATE_LIMIT_PER_DAY',
      500
    ),
    assistantConversationLogRateLimitSalt:
      env.ASSISTANT_CONVERSATION_LOG_RATE_LIMIT_SALT ||
      DEFAULT_ASSISTANT_CONVERSATION_LOG_RATE_LIMIT_SALT,
    altchaHmacKey: requiredEnv(env, 'ALTCHA_HMAC_KEY'),
    altchaCost: getPositiveNumberEnv(env, 'ALTCHA_COST', 2_000),
    altchaCounterMin: getPositiveNumberEnv(env, 'ALTCHA_COUNTER_MIN', 1_000),
    altchaCounterMax: getPositiveNumberEnv(env, 'ALTCHA_COUNTER_MAX', 3_000),
    secureCookies: env.NODE_ENV === 'production' || env.CONTEXT === 'production',
    visitHashKey: env.VISIT_BLIND_INDEX_KEY || loginRateLimitSalt || DEFAULT_VISIT_HASH_KEY,
    outreachEncryptionKeyActiveVersion: getPositiveIntegerEnv(
      env,
      'OUTREACH_ENCRYPTION_KEY_ACTIVE_VERSION',
      1
    ),
    outreachEncryptionKeys: collectVersionedKeys(env, 'OUTREACH_ENCRYPTION_KEY'),
    outreachBlindIndexKey: requiredEnv(env, 'OUTREACH_BLIND_INDEX_KEY'),
    assistantConversationEncryptionKeyActiveVersion: getPositiveIntegerEnv(
      env,
      'ASSISTANT_CONVERSATION_ENCRYPTION_KEY_ACTIVE_VERSION',
      1
    ),
    assistantConversationEncryptionKeys: collectVersionedKeys(
      env,
      'ASSISTANT_CONVERSATION_ENCRYPTION_KEY'
    ),
  };
}

function requiredEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];

  if (!value) {
    throw createAdminError(503, 'configuration_error', `Missing required environment variable: ${name}`);
  }

  return value;
}

function getPositiveNumberEnv(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const value = Number(env[name]);

  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getPositiveIntegerEnv(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const value = getPositiveNumberEnv(env, name, fallback);

  if (!Number.isInteger(value)) {
    throw createAdminError(503, 'configuration_error', `${name} must be a positive integer`);
  }

  return value;
}

function collectVersionedKeys(env: NodeJS.ProcessEnv, baseName: string): Record<number, string> {
  const keys: Record<number, string> = {};

  if (env[baseName]) {
    keys[1] = env[baseName];
  }

  for (const [name, value] of Object.entries(env)) {
    const match = name.match(new RegExp(`^${baseName}_V(\\d+)$`));
    if (match && value) {
      keys[Number(match[1])] = value;
    }
  }

  return keys;
}
