import { maintenanceContainer } from '../../di/maintenance.container.js';
import type { ILogger, LogContext } from '../../../../shared/logger/ilogger.js';

export class MaintenanceController {
  constructor(
    private readonly maintenance = maintenanceContainer,
    private readonly logger: ILogger = maintenanceContainer.logger
  ) {}

  async retentionCleanup(): Promise<void> {
    await this.runTask('retention_cleanup', async () => {
      const assistantConversations =
        await this.maintenance.deleteOldAssistantConversationsUseCase.execute();
      const visitSessions = await this.maintenance.deleteOldVisitSessionsUseCase.execute();

      return {
        assistantConversationsCutoff: assistantConversations.cutoff,
        assistantConversationsDeleted: assistantConversations.deleted,
        visitSessionsCutoff: visitSessions.cutoff,
        visitSessionsDeleted: visitSessions.deleted,
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
