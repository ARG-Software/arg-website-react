export interface IUserIdentity {
  email: string;
  name?: string;
}

export interface IUserSession {
  access_token: string;
  refresh_token: string;
}

export interface IUserSignInResult {
  session: IUserSession | null;
  user: IUserIdentity | null;
  error?: Error;
}

export interface IUserRefreshSessionResult {
  session: IUserSession | null;
  user: IUserIdentity | null;
  error?: Error;
}

export interface IUserIdentityProvider {
  getUser(token: string): Promise<IUserIdentity | null>;
  signInWithPassword(credentials: { email: string; password: string }): Promise<IUserSignInResult>;
  refreshSession(refreshToken: string): Promise<IUserRefreshSessionResult>;
  signOut(accessToken: string): Promise<void>;
  updateUser(accessToken: string, data: Record<string, string>): Promise<void>;
}
