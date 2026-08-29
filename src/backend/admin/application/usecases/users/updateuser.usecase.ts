import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { createAdminError } from '../../errors.js';
import type { IUserIdentity, IUserIdentityProvider } from '../../ports/iuseridentity.provider.js';

export interface UpdateUserInput {
  accessToken: string;
  user: IUserIdentity;
  name?: string;
  password?: string;
}

export class UpdateUserUseCase {
  constructor(private readonly identityProvider: IUserIdentityProvider, private readonly logger?: ILogger) {}

  async execute(input: UpdateUserInput): Promise<{ success: true }> {
    if (!input.accessToken) {
      this.logger?.warn('Admin user update rejected', { reason: 'missing_access_token' });
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
      this.logger?.warn('Admin user update rejected', { reason: 'empty_update' });
      throw createAdminError(400, 'invalid_update', 'No valid update data provided');
    }

    this.logger?.info('Admin user update started', { updatedFields: Object.keys(updateData) });
    await this.identityProvider.updateUser(input.accessToken, updateData);
    this.logger?.info('Admin user update completed', { updatedFields: Object.keys(updateData) });
    return { success: true };
  }
}
