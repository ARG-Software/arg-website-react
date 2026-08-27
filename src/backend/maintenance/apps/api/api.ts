import { MaintenanceController } from './controllers/MaintenanceController.js';

let controller: MaintenanceController;

export function runAssistantConversationsRetention(): Promise<void> {
  return getController().assistantConversationsRetention();
}

export function runVisitEventsRetention(): Promise<void> {
  return getController().visitEventsRetention();
}

export function runKeepDatabaseAlive(): Promise<void> {
  return getController().keepDatabaseAlive();
}

function getController(): MaintenanceController {
  controller ||= new MaintenanceController();

  return controller;
}
