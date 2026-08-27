export class MaintenanceApplicationError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'MaintenanceApplicationError';
  }
}

export function createMaintenanceError(
  statusCode: number,
  code: string,
  message: string
): MaintenanceApplicationError {
  return new MaintenanceApplicationError(statusCode, code, message);
}
