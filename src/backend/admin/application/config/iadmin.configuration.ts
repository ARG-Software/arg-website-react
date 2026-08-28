import type { IRateLimitConfig } from '../../../shared/security/ratelimit.js';
import type { AltchaSettings } from '../../../shared/security/altcha.js';

export interface IAdminConfiguration {
  getAdminDatabaseUrl(): string;
  getAdminDatabaseAnonKey(): string;
  getAdminDatabaseServiceRoleKey(): string;
  getAdminSiteUrl(): string;
  getNotificationWebhookUrl(): string;
  getAuditSalt(): string;
  getSecureCookies(): boolean;
  getVisitHashKey(): string;
  getOutreachBlindIndexKey(): string;
  getActiveOutreachEncryptionKeyVersion(): number;
  getOutreachEncryptionKey(version: number): string;
  getActiveAssistantConversationEncryptionKeyVersion(): number;
  getAssistantConversationEncryptionKey(version: number): string;
  getAssistantConversationEncryptionKeys(): Record<number, string>;
  getLoginRateLimitConfig(): IRateLimitConfig;
  getVisitLogRateLimitConfig(): IRateLimitConfig;
  getAssistantConversationLogRateLimitConfig(): IRateLimitConfig;
  getAltchaSettings(): AltchaSettings;
}
