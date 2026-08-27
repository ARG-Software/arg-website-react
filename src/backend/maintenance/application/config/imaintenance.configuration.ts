export interface IMaintenanceConfiguration {
  getAdminDatabaseUrl(): string;
  getAdminDatabaseServiceRoleKey(): string;
  getRagDatabaseUrl(): string;
  getRagDatabaseServiceRoleKey(): string;
}
