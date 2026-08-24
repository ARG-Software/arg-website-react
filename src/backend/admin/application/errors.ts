export class AdminApplicationError extends Error {
  statusCode: number;
  code: string;
  retryAfterSeconds?: number;

  constructor(statusCode, code, message) {
    super(message);
    this.name = 'AdminApplicationError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function createAdminError(statusCode, code, message) {
  return new AdminApplicationError(statusCode, code, message);
}

export function getAdminErrorStatus(error) {
  return Number.isInteger(error?.statusCode) ? error.statusCode : 500;
}
