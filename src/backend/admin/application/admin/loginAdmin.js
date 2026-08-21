import { checkRateLimits } from '../../../shared/security/rateLimit.js';
import { createAdminError } from '../errors.js';
import { setSessionCookies } from '../../infrastructure/http/adminCookies.js';

export async function loginAdmin(input, dependencies) {
  const email = normalizeEmail(input.email);
  const password = String(input.password || '');
  const altcha = String(input.altcha || '');
  const clientIp = String(input.clientIp || 'unknown');
  const response = input.response;

  if (!email || !password) {
    throw createAdminError(400, 'missing_credentials', 'Email and password are required');
  }

  const rateLimit = await checkRateLimits(
    clientIp,
    dependencies.loginRateLimit.store,
    dependencies.loginRateLimit.config
  );

  if (!rateLimit.allowed) {
    const error = createAdminError(429, 'rate_limited', 'Too many login attempts');
    error.retryAfterSeconds = rateLimit.retryAfterSeconds;
    throw error;
  }

  if (!altcha) {
    throw createAdminError(403, 'bot_verification_failed', 'Verification required');
  }

  const altchaResult = await Promise.resolve(
    dependencies.humanVerification.verifyPayload(altcha)
  ).catch(() => null);

  if (!altchaResult?.verified) {
    throw createAdminError(403, 'bot_verification_failed', 'Verification failed');
  }

  const result = await dependencies.identityProvider.signInWithPassword({ email, password });

  if (!result.session || !result.user?.email) {
    throw createAdminError(401, 'invalid_credentials', 'Invalid email or password');
  }

  if (!(await dependencies.adminAccessPolicy.canAccess(result.user.email))) {
    throw createAdminError(403, 'forbidden', 'Admin access denied');
  }

  if (response) {
    setSessionCookies(
      response,
      {
        accessToken: result.session.access_token,
        refreshToken: result.session.refresh_token,
      },
      dependencies.env
    );
  }

  return {
    user: result.user,
  };
}

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}
