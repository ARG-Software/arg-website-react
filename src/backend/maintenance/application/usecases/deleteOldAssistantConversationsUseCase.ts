import type { IMaintenanceRepository } from '../ports/repositories/IMaintenanceRepository.js';

const RETENTION_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

export class DeleteOldAssistantConversationsUseCase {
  constructor(private readonly maintenanceRepository: IMaintenanceRepository) {}

  async execute(): Promise<{ cutoff: string; deleted: number }> {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * DAY_MS).toISOString();
    const deleted = await this.maintenanceRepository.deleteOldAssistantConversations(cutoff);

    return { cutoff, deleted };
  }
}
