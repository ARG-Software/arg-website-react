export interface IAdminIdentityUser {
  email: string;
  name?: string;
}

export interface IAdminIdentitySession {
  access_token: string;
  refresh_token: string;
}

export interface IAdminSignInResult {
  session: IAdminIdentitySession | null;
  user: IAdminIdentityUser | null;
  error?: Error;
}

export interface IAdminRefreshSessionResult {
  session: IAdminIdentitySession | null;
  user: IAdminIdentityUser | null;
  error?: Error;
}

export interface IAdminIdentityProvider {
  getUser(token: string): Promise<IAdminIdentityUser | null>;
  signInWithPassword(credentials: { email: string; password: string }): Promise<IAdminSignInResult>;
  refreshSession(refreshToken: string): Promise<IAdminRefreshSessionResult>;
  signOut(accessToken: string): Promise<void>;
  updateUser(accessToken: string, data: Record<string, string>): Promise<void>;
}
