import { maintenanceContainer } from '../../di/maintenance.container.js';

export class MaintenanceController {
  constructor(private readonly maintenance = maintenanceContainer) {}

  async assistantConversationsRetention(): Promise<void> {
    const result = await this.maintenance.deleteOldAssistantConversationsUseCase.execute();

    console.log('Assistant conversation retention completed', {
      cutoff: result.cutoff,
      deleted: result.deleted,
    });
  }

  async visitEventsRetention(): Promise<void> {
    const result = await this.maintenance.deleteOldVisitSessionsUseCase.execute();

    console.log('Visit analytics retention completed', {
      cutoff: result.cutoff,
      deleted: result.deleted,
    });
  }

  async keepDatabaseAlive(): Promise<void> {
    const startedAt = Date.now();
    await this.maintenance.keepDatabasesAliveUseCase.execute();

    console.log('Database keepalive completed', {
      databases: ['rag', 'admin'],
      durationMs: Date.now() - startedAt,
    });
  }
}
