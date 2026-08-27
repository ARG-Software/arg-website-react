import type { IMaintenanceRepository } from '../ports/repositories/imaintenance.repository.js';

export class KeepDatabasesAliveUseCase {
  constructor(private readonly maintenanceRepository: IMaintenanceRepository) {}

  async execute(): Promise<void> {
    await this.maintenanceRepository.keepDatabasesAlive();
  }
}
