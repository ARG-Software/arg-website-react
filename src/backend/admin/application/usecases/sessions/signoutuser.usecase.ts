import type { ILogger } from '../../../../shared/logger/ilogger.js';
import type { IUserIdentityProvider } from '../../ports/iuseridentity.provider.js';

export class SignOutUserUseCase {
  constructor(private readonly identityProvider: IUserIdentityProvider, private readonly logger?: ILogger) {}

  async execute(accessToken: string): Promise<void> {
    this.logger?.info('Admin sign out started', { hasAccessToken: Boolean(accessToken) });
    await this.identityProvider.signOut(accessToken);
    this.logger?.info('Admin sign out completed');
  }
}
