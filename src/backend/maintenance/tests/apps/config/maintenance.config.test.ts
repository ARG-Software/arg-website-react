import assert from 'node:assert/strict';
import test from 'node:test';

import { MaintenanceConfig, readMaintenanceConfigValues } from '../../../apps/config/maintenance.config.js';

const ENV = {
  ADMIN_DATABASE_URL: 'https://admin.supabase.co',
  ADMIN_DATABASE_SERVICE_ROLE_KEY: 'admin-service-key',
  RAG_DATABASE_URL: 'https://rag.supabase.co',
  RAG_DATABASE_SERVICE_ROLE_KEY: 'rag-service-key',
};

test('loads maintenance configuration from environment', () => {
  MaintenanceConfig.reset();

  const config = MaintenanceConfig.load(ENV);

  assert.equal(config.getAdminDatabaseUrl(), ENV.ADMIN_DATABASE_URL);
  assert.equal(config.getAdminDatabaseServiceRoleKey(), ENV.ADMIN_DATABASE_SERVICE_ROLE_KEY);
  assert.equal(config.getRagDatabaseUrl(), ENV.RAG_DATABASE_URL);
  assert.equal(config.getRagDatabaseServiceRoleKey(), ENV.RAG_DATABASE_SERVICE_ROLE_KEY);
});

test('throws configuration errors for missing maintenance environment', () => {
  assert.throws(() => readMaintenanceConfigValues({}), {
    name: 'MaintenanceApplicationError',
    code: 'configuration_error',
    statusCode: 503,
  });
});
