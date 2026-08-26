import { createAdminError } from '../../errors.js';
import type { IUserIdentity, IUserIdentityProvider } from '../../ports/IUserIdentityProvider.js';

export interface UpdateUserInput {
  accessToken: string;
  user: IUserIdentity;
  name?: string;
  password?: string;
}

export class UpdateUserUseCase {
  constructor(private readonly identityProvider: IUserIdentityProvider) {}

  async execute(input: UpdateUserInput): Promise<{ success: true }> {
    if (!input.accessToken) {
      throw createAdminError(401, 'unauthenticated', 'Login required');
    }

    const updateData: Record<string, string> = {};

    if (input.name !== undefined && input.name.trim() !== (input.user.name || '')) {
      updateData.name = input.name.trim();
    }

    if (input.password) {
      updateData.password = input.password;
    }

    if (Object.keys(updateData).length === 0) {
      throw createAdminError(400, 'invalid_update', 'No valid update data provided');
    }

    await this.identityProvider.updateUser(input.accessToken, updateData);
    return { success: true };
  }
}
