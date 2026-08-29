import { randomUUID } from 'node:crypto';

import { runWithLogContext } from '../../../shared/logger/logcontext.js';
import { MaintenanceController } from './controllers/maintenance.controller.js';

let controller: MaintenanceController;

export function runRetentionCleanup(): Promise<void> {
  return runWithMaintenanceLogContext('retention_cleanup', () => getController().retentionCleanup());
}

export function runKeepDatabaseAlive(): Promise<void> {
  return runWithMaintenanceLogContext('database_keepalive', () => getController().keepDatabaseAlive());
}

function runWithMaintenanceLogContext(task: string, callback: () => Promise<void>): Promise<void> {
  return runWithLogContext(
    {
      taskRunId: randomUUID(),
      service: 'maintenance',
      task,
    },
    callback
  );
}

function getController(): MaintenanceController {
  controller ||= new MaintenanceController();

  return controller;
}
