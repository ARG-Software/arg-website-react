export class SupabaseAdminIdentityProvider {
  constructor(client) {
    this.client = client;
  }

  async getUser(token) {
    const { data, error } = await this.client.auth.getUser(token);

    if (error || !data.user?.email) return null;

    return { email: data.user.email };
  }

  async signInWithPassword({ email, password }) {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });

    if (error || !data.session || !data.user?.email) {
      return { error };
    }

    return {
      session: data.session,
      user: { email: data.user.email },
    };
  }

  async refreshSession(refreshToken) {
    const { data, error } = await this.client.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session || !data.user?.email) {
      return { error };
    }

    return {
      session: data.session,
      user: { email: data.user.email },
    };
  }

  async signOut(accessToken) {
    try {
      await this.client.auth.signOut({ accessToken });
    } catch (error) {
      // Ignore errors during sign out to ensure cookies can always be cleared
      console.error('Supabase sign out failed', error);
    }
  }

  async updateUser(accessToken, data) {
    const { error } = await this.client.auth.updateUser(data, { accessToken });

    if (error) {
      throw error;
    }
  }
}
