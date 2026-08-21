import { createAdminError } from '../../application/errors.js';

export function getAdminConfig(env) {
  return {
    auditSalt: env.OUTREACH_AUDIT_SALT || 'outreach',
    databaseUrl: requiredEnv(env, 'ADMIN_DATABASE_URL'),
    databaseServiceRoleKey: requiredEnv(env, 'ADMIN_DATABASE_SERVICE_ROLE_KEY'),
    loginRateLimitSalt: env.ADMIN_LOGIN_RATE_LIMIT_SALT || 'arg-admin-login-rate-limit',
  };
}

function requiredEnv(env, name) {
  const value = env[name];

  if (!value) {
    throw createAdminError(
      503,
      'configuration_error',
      `Missing required environment variable: ${name}`
    );
  }

  return value;
}
