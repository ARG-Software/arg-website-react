export class RagApplicationError extends Error {
  retryAfterSeconds?: number;

  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'RagApplicationError';
  }
}

export function createRagError(statusCode: number, code: string, message: string): RagApplicationError {
  return new RagApplicationError(statusCode, code, message);
}

export function getRagErrorStatus(error: any): number {
  if (Number.isInteger(error?.statusCode)) return error.statusCode;
  if (error?.name === 'RagValidationError') return 400;
  if (error?.code === 'embedding_quota_exceeded' || isConfigurationError(error)) return 503;

  return 500;
}

export function isConfigurationError(error: any): boolean {
  return (
    error?.code === 'configuration_error' ||
    (error instanceof Error &&
      (error.message.startsWith('Missing required environment variable:') ||
        error.message.startsWith('Missing required environment variables:')))
  );
}
