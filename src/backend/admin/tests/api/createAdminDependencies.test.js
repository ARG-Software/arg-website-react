import assert from 'node:assert/strict';
import test from 'node:test';

import { createAdminDependencyFactory } from '../../apps/di/createAdminDependencies.js';

test('login dependencies keep auth sign-in separate from privileged admin checks', async () => {
  const env = {
    ADMIN_DATABASE_URL: 'https://admin-project.supabase.co',
    ADMIN_DATABASE_SERVICE_ROLE_KEY: 'service-role-key',
    VITE_ADMIN_DATABASE_ANON_KEY: 'anon-key',
    ALTCHA_HMAC_KEY: 'altcha-hmac-key',
  };
  const calls = [];
  const serviceClient = createFakeServiceClient(calls);
  const authClient = { kind: 'auth' };
  const createDependencies = createAdminDependencyFactory({
    createAuthClient: () => authClient,
    createServiceClient: () => serviceClient,
  });
  const dependencies = createDependencies({ env }).createLoginDependencies();

  await dependencies.adminAccessPolicy.canAccess('admin@arg.software');

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
