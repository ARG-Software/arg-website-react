import { maintenanceContainer } from '../../di/maintenance.container.js';
import type { ILogger, LogContext } from '../../../../shared/logger/ilogger.js';

export class MaintenanceController {
  constructor(
    private readonly maintenance = maintenanceContainer,
    private readonly logger: ILogger = maintenanceContainer.logger
  ) {}

  async assistantConversationsRetention(): Promise<void> {
    await this.runTask('assistant_conversations_retention', async () => {
      const result = await this.maintenance.deleteOldAssistantConversationsUseCase.execute();
      return {
        cutoff: result.cutoff,
        deleted: result.deleted,
      };
    });
  }

  async visitEventsRetention(): Promise<void> {
    await this.runTask('visit_events_retention', async () => {
      const result = await this.maintenance.deleteOldVisitSessionsUseCase.execute();
      return {
        cutoff: result.cutoff,
        deleted: result.deleted,
      };
    });
  }

  async keepDatabaseAlive(): Promise<void> {
    await this.runTask('database_keepalive', async () => {
      await this.maintenance.keepDatabasesAliveUseCase.execute();
      return { databases: ['rag', 'admin'] };
    });
  }

  private async runTask(task: string, execute: () => Promise<LogContext>): Promise<void> {
    const startedAt = Date.now();
    this.logger.info('Maintenance task started', { task });

    try {
      this.logger.info('Maintenance task completed', {
        task,
        ...(await execute()),
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      this.logger.error('Maintenance task failed', {
        task,
        durationMs: Date.now() - startedAt,
        error,
      });
      throw error;
    }
  }
}
