import type { SupabaseClient } from '@supabase/supabase-js';

import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { logOperation } from '../../../../shared/logger/logoperation.js';
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
    return logOperation(
      this.logger,
      'Supabase auth user lookup',
      { provider: 'supabase_auth', hasToken: Boolean(token) },
      async () => {
        const { data, error } = await this.client.auth.getUser(token);

        if (error || !data.user?.email) return null;

        return { email: data.user.email };
      },
      result => ({ authenticated: Boolean(result) })
    );
  }

  async signInWithPassword({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<IUserSignInResult> {
    return logOperation(
      this.logger,
      'Supabase auth password sign-in',
      { provider: 'supabase_auth', emailHash: hashLogValue(email) },
      async () => {
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
      },
      result => ({
        authenticated: Boolean(result.session),
        hasProviderError: 'error' in result && Boolean(result.error),
      })
    );
  }

  async refreshSession(refreshToken: string): Promise<IUserRefreshSessionResult> {
    return logOperation(
      this.logger,
      'Supabase auth session refresh',
      { provider: 'supabase_auth', hasRefreshToken: Boolean(refreshToken) },
      async () => {
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
      },
      result => ({
        refreshed: Boolean(result.session),
        hasProviderError: 'error' in result && Boolean(result.error),
      })
    );
  }

  async signOut(accessToken: string): Promise<void> {
    await logOperation(
      this.logger,
      'Supabase auth sign out',
      { provider: 'supabase_auth', hasAccessToken: Boolean(accessToken) },
      async () => {
      const signOut = this.client.auth.signOut as unknown as (options: {
        accessToken: string;
      }) => Promise<void>;
      await signOut({ accessToken });
      }
    ).catch(() => undefined);
  }

  async updateUser(accessToken: string, data: Record<string, string>): Promise<void> {
    await logOperation(
      this.logger,
      'Supabase auth user update',
      {
        provider: 'supabase_auth',
        hasAccessToken: Boolean(accessToken),
        updatedFields: Object.keys(data),
      },
      async () => {
        const updateUser = this.client.auth.updateUser as unknown as (
          data: Record<string, string>,
          options: { accessToken: string }
        ) => Promise<{ error: Error | null }>;
        const { error } = await updateUser(data, { accessToken });

        if (error) {
          throw error;
        }
      }
    );
  }
}

function hashLogValue(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return `hash_${Math.abs(hash)}`;
}
