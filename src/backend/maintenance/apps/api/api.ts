import { MaintenanceController } from './controllers/maintenance.controller.js';

let controller: MaintenanceController;

export function runRetentionCleanup(): Promise<void> {
  return getController().retentionCleanup();
}

export function runKeepDatabaseAlive(): Promise<void> {
  return getController().keepDatabaseAlive();
}

function getController(): MaintenanceController {
  controller ||= new MaintenanceController();

  return controller;
}
