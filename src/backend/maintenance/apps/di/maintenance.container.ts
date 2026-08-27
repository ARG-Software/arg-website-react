import { createMaintenanceContainer } from './createmaintenance.container.js';

let container: ReturnType<typeof createMaintenanceContainer>;

export function getMaintenanceContainer() {
  container ||= createMaintenanceContainer();

  return container;
}

export const maintenanceContainer = {
  get deleteOldAssistantConversationsUseCase() {
    return getMaintenanceContainer().deleteOldAssistantConversationsUseCase;
  },
  get deleteOldVisitSessionsUseCase() {
    return getMaintenanceContainer().deleteOldVisitSessionsUseCase;
  },
  get keepDatabasesAliveUseCase() {
    return getMaintenanceContainer().keepDatabasesAliveUseCase;
  },
};
