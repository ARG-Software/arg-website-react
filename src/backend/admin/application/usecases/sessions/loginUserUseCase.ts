import {
  checkRateLimits,
  type IRateLimitConfig,
  type IRateLimitStore,
} from '../../../../shared/security/rateLimit.js';
import { createAdminError } from '../../errors.js';
import type {
  IUserIdentity,
  IUserIdentityProvider,
  IUserSession,
} from '../../ports/IUserIdentityProvider.js';
import type { UserAccessPolicy } from '../../policies/userAccessPolicy.js';

export class LoginUserUseCase {
  constructor(
    private readonly humanVerification: {
      verifyPayload(payload: string): Promise<{ verified?: boolean }> | { verified?: boolean };
    },
    private readonly identityProvider: IUserIdentityProvider,
    private readonly loginRateLimit: { store: IRateLimitStore; config: IRateLimitConfig },
    private readonly userAccessPolicy: UserAccessPolicy
  ) {}

  async execute(input: { email?: string; password?: string; altcha?: string; clientIp?: string }): Promise<{
    session: IUserSession;
    user: IUserIdentity;
  }> {
    const email = normalizeEmail(input.email);
    const password = String(input.password || '');
    const altcha = String(input.altcha || '');
    const clientIp = String(input.clientIp || 'unknown');

    if (!email || !password) {
      throw createAdminError(400, 'missing_credentials', 'Email and password are required');
    }

    const rateLimit = await checkRateLimits(
      clientIp,
      this.loginRateLimit.store,
      this.loginRateLimit.config
    );

    if (!rateLimit.allowed) {
      const error = createAdminError(429, 'rate_limited', 'Too many login attempts');
      error.retryAfterSeconds = rateLimit.retryAfterSeconds;
      throw error;
    }

    if (!altcha) {
      throw createAdminError(403, 'bot_verification_failed', 'Verification required');
    }

    const altchaResult = await Promise.resolve(this.humanVerification.verifyPayload(altcha)).catch(
      () => null
    );

    if (!altchaResult?.verified) {
      throw createAdminError(403, 'bot_verification_failed', 'Verification failed');
    }

    const result = await this.identityProvider.signInWithPassword({ email, password });

    if (!result.session || !result.user?.email) {
      throw createAdminError(401, 'invalid_credentials', 'Invalid email or password');
    }

    if (!(await this.userAccessPolicy.canAccess(result.user.email))) {
      throw createAdminError(403, 'forbidden', 'Admin access denied');
    }

    return {
      session: result.session,
      user: result.user,
    };
  }
}

function normalizeEmail(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}
