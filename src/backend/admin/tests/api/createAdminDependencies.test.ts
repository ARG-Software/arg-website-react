import assert from 'node:assert/strict';
import test from 'node:test';

import { AdminConfig } from '../../apps/config/AdminConfig.js';
import { createAdminDependencyFactory } from '../../apps/di/createAdminDependencies.js';

test('login dependencies keep auth sign-in separate from privileged admin checks', async () => {
  const config = {
    adminDatabaseUrl: 'https://admin-project.supabase.co',
    adminDatabaseServiceRoleKey: 'service-role-key',
    adminDatabaseAnonKey: 'anon-key',
    auditSalt: 'outreach',
    loginRateLimitPerMinute: 6,
    loginRateLimitPerDay: 30,
    loginGlobalRateLimitPerDay: 500,
    loginRateLimitSalt: 'arg-admin-login-rate-limit',
    visitLogRateLimitPerMinute: 6,
    visitLogRateLimitPerDay: 30,
    visitLogGlobalRateLimitPerDay: 500,
    visitLogRateLimitSalt: 'arg-visit-log-rate-limit',
    assistantConversationLogRateLimitPerMinute: 6,
    assistantConversationLogRateLimitPerDay: 30,
    assistantConversationLogGlobalRateLimitPerDay: 500,
    assistantConversationLogRateLimitSalt: 'arg-assistant-conversation-log-rate-limit',
    altchaHmacKey: 'altcha-hmac-key',
    altchaCost: 100,
    altchaCounterMin: 10,
    altchaCounterMax: 50,
    secureCookies: false,
    visitHashKey: 'visit-hash-key',
    outreachEncryptionKeyActiveVersion: 1,
    outreachEncryptionKeys: { 1: 'x'.repeat(32) },
    outreachBlindIndexKey: 'blind-index-key',
    assistantConversationEncryptionKeyActiveVersion: 1,
    assistantConversationEncryptionKeys: { 1: 'y'.repeat(32) },
  };
  const calls = [];
  const serviceClient = createFakeServiceClient(calls);
  const authClient = { kind: 'auth' };
  const createDependencies = createAdminDependencyFactory({
    createAuthClient: () => authClient,
    createServiceClient: () => serviceClient,
  });
  AdminConfig.reset();
  const dependencies = createDependencies({ config: AdminConfig.configure(config) }).createLoginDependencies();

  await dependencies.userAccessPolicy.canAccess('admin@arg.software');

  assert.equal(dependencies.identityProvider.client, authClient);
  assert.equal(dependencies.loginRateLimit.store.supabase, serviceClient);
  assert.deepEqual(calls, ['service:from:admin_users']);
});

function createFakeServiceClient(calls) {
  return {
    kind: 'service',
    from(table) {
      calls.push(`service:from:${table}`);
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        maybeSingle() {
          return { data: { email: 'admin@arg.software', role: 'owner' }, error: null };
        },
      };
    },
  };
}
