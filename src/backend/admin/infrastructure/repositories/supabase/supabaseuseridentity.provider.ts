import type { SupabaseClient } from '@supabase/supabase-js';

import type { ILogger } from '../../../../shared/logger/ilogger.js';
import type {
  IUserIdentity,
  IUserIdentityProvider,
  IUserRefreshSessionResult,
  IUserSignInResult,
} from '../../../application/ports/iuseridentity.provider.js';

export class SupabaseUserIdentityProvider implements IUserIdentityProvider {
  constructor(
    private readonly client: SupabaseClient,
    private readonly logger?: ILogger
  ) {}

  async getUser(token: string): Promise<IUserIdentity | null> {
    const { data, error } = await this.client.auth.getUser(token);

    if (error || !data.user?.email) return null;

    return { email: data.user.email };
  }

  async signInWithPassword({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<IUserSignInResult> {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });

    if (error || !data.session || !data.user?.email) {
      return {
        session: null,
        user: null,
        ...(error ? { error } : {}),
      };
    }

    return {
      session: data.session,
      user: { email: data.user.email },
    };
  }

  async refreshSession(refreshToken: string): Promise<IUserRefreshSessionResult> {
    const { data, error } = await this.client.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session || !data.user?.email) {
      return {
        session: null,
        user: null,
        ...(error ? { error } : {}),
      };
    }

    return {
      session: data.session,
      user: { email: data.user.email },
    };
  }

  async signOut(accessToken: string): Promise<void> {
    try {
      const signOut = this.client.auth.signOut as unknown as (options: {
        accessToken: string;
      }) => Promise<void>;
      await signOut({ accessToken });
    } catch (error) {
      this.logger?.error('Supabase sign out failed', { error });
    }
  }

  async updateUser(accessToken: string, data: Record<string, string>): Promise<void> {
    const updateUser = this.client.auth.updateUser as unknown as (
      data: Record<string, string>,
      options: { accessToken: string }
    ) => Promise<{ error: Error | null }>;
    const { error } = await updateUser(data, { accessToken });

    if (error) {
      throw error;
    }
  }
}
