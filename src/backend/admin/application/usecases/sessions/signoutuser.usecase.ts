import type { IUserIdentityProvider } from '../../ports/iuseridentity.provider.js';

export class SignOutUserUseCase {
  constructor(private readonly identityProvider: IUserIdentityProvider) {}

  async execute(accessToken: string): Promise<void> {
    await this.identityProvider.signOut(accessToken);
  }
}
