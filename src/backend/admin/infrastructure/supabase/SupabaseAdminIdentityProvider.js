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
}
