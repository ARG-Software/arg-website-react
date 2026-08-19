import { createAdminError } from '../../application/errors.js';

export function getAdminConfig(env) {
  return {
    allowedAdminEmails: readList(env.OUTREACH_ADMIN_EMAILS),
    auditSalt: env.OUTREACH_AUDIT_SALT || 'outreach',
    databaseUrl: requiredEnv(env, 'DATABASE_URL'),
    databaseServiceRoleKey: requiredEnv(env, 'DATABASE_SERVICE_ROLE_KEY'),
  };
}

function readList(value) {
  return (value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
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
