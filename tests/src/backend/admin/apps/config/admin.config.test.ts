import assert from 'node:assert/strict';
import test from 'node:test';

import { readAdminConfigValues } from '../../../../../../src/backend/admin/apps/config/admin.config.js';

const REQUIRED_ENV = {
  ADMIN_DATABASE_URL: 'https://database.example',
  ADMIN_DATABASE_ANON_KEY: 'anon-key',
  ADMIN_DATABASE_SERVICE_ROLE_KEY: 'service-role-key',
  ALTCHA_HMAC_KEY: 'altcha-key',
  OUTREACH_BLIND_INDEX_KEY: 'blind-index-key',
};

test('deployed environments always use secure admin cookies', () => {
  for (const context of ['production', 'deploy-preview', 'branch-deploy']) {
    const config = readAdminConfigValues({ ...REQUIRED_ENV, CONTEXT: context });
    assert.equal(config.secureCookies, true, context);
  }
});

test('local HTTP development can use non-secure admin cookies', () => {
  assert.equal(readAdminConfigValues({ ...REQUIRED_ENV }).secureCookies, false);
  assert.equal(readAdminConfigValues({ ...REQUIRED_ENV, CONTEXT: 'dev' }).secureCookies, false);
});
