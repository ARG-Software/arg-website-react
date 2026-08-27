import type { IMaintenanceRepository } from '../ports/repositories/IMaintenanceRepository.js';

const RETENTION_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

export class DeleteOldVisitSessionsUseCase {
  constructor(private readonly maintenanceRepository: IMaintenanceRepository) {}

  async execute(): Promise<{ cutoff: string; deleted: { events: number; sessions: number } }> {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * DAY_MS).toISOString();
    const deleted = await this.maintenanceRepository.deleteOldVisitSessions(cutoff);

    return { cutoff, deleted };
  }
}
