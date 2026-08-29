import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { logOperation } from '../../../../shared/logger/logoperation.js';
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
    private readonly userAccessPolicy: UserAccessPolicy,
    private readonly logger?: ILogger
  ) {}

  async execute(input: { email?: string; password?: string }): Promise<{
    session: IUserSession;
    user: IUserIdentity;
  }> {
    const email = normalizeEmail(input.email);
    const password = String(input.password || '');

    if (!email || !password) {
      this.logger?.warn('Admin login rejected', { reason: 'missing_credentials', hasEmail: Boolean(email) });
      throw createAdminError(400, 'missing_credentials', 'Email and password are required');
    }

    const result = await logOperation(
      this.logger,
      'Admin login identity check',
      { hasEmail: Boolean(email) },
      () => this.identityProvider.signInWithPassword({ email, password }),
      signInResult => ({ authenticated: Boolean(signInResult.session), hasProviderError: Boolean(signInResult.error) })
    );

    if (!result.session || !result.user?.email) {
      this.logger?.warn('Admin login rejected', { reason: 'invalid_credentials' });
      throw createAdminError(401, 'invalid_credentials', 'Invalid email or password');
    }

    if (!(await this.userAccessPolicy.canAccess(result.user.email))) {
      this.logger?.warn('Admin login rejected', { reason: 'forbidden' });
      throw createAdminError(403, 'forbidden', 'Admin access denied');
    }

    this.logger?.info('Admin login authorized');

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
