export interface IAdminUser {
  email: string;
  role?: string;
}

export interface IAdminUserRepository {
  findActiveByEmail(email: string): Promise<IAdminUser | null>;
}
