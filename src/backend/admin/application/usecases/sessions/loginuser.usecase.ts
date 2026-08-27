import {
  checkRateLimits,
  type IRateLimitConfig,
  type IRateLimitStore,
} from '../../../../shared/security/ratelimit.js';
import { createAdminError } from '../../errors.js';
import type {
  IUserIdentity,
  IUserIdentityProvider,
  IUserSession,
} from '../../ports/iuseridentity.provider.js';
import type { UserAccessPolicy } from '../../policies/useraccess.policy.js';

export class LoginUserUseCase {
  constructor(
    private readonly identityProvider: IUserIdentityProvider,
    private readonly loginRateLimit: { store: IRateLimitStore; config: IRateLimitConfig },
    private readonly userAccessPolicy: UserAccessPolicy
  ) {}

  async execute(input: { email?: string; password?: string; clientIp?: string }): Promise<{
    session: IUserSession;
    user: IUserIdentity;
  }> {
    const email = normalizeEmail(input.email);
    const password = String(input.password || '');
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
