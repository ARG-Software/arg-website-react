export class SupabaseAdminIdentityProvider {
  constructor(client) {
    this.client = client;
  }

  async getUser(token) {
    const { data, error } = await this.client.auth.getUser(token);

    if (error || !data.user?.email) return null;

    return { email: data.user.email };
  }
}
