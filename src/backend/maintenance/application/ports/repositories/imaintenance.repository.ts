export interface IMaintenanceRepository {
  deleteOldAssistantConversations(cutoffIso: string): Promise<number>;
  deleteOldVisitSessions(cutoffIso: string): Promise<{ events: number; sessions: number }>;
  keepDatabasesAlive(): Promise<void>;
}
