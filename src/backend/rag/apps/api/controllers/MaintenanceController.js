import { keepDatabasesAlive } from '../../../../shared/maintenance/keepDatabaseAlive.js';
import { adminContainer } from '../../../../admin/apps/di/adminContainer.ts';
import { createGasparDependencies } from '../../di/createGasparDependencies.ts';
import { getRagConfig } from '../../../application/ragConfig.ts';

export class MaintenanceController {
  constructor({ createDependencies = createGasparDependencies, env = process.env } = {}) {
    this.createDependencies = createDependencies;
    this.env = env;
    this.ragConfig = undefined;
  }

  async keepDatabaseAlive() {
    const startedAt = Date.now();
    const gasparDependencies = this.createDependencies({
      config: this.getRagAppConfig(),
    }).createMaintenanceDependencies();

    await keepDatabasesAlive([
      {
        ...gasparDependencies,
        tableName: 'rag_sources',
      },
      adminContainer.maintenance,
    ]);

    console.log('Database keepalive completed', {
      databases: ['rag', 'admin'],
      durationMs: Date.now() - startedAt,
    });
  }

  getRagAppConfig() {
    this.ragConfig ||=
      this.createDependencies === createGasparDependencies ? getRagConfig(this.env) : undefined;
    return this.ragConfig;
  }
}

export const keepDatabaseAliveConfig = {
  schedule: '0 9 */3 * *',
};

let controller;

export function runKeepDatabaseAlive() {
  controller ||= new MaintenanceController();
  return controller.keepDatabaseAlive();
}
