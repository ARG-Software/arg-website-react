import type { ILogger, LogContext } from './ilogger.js';

export async function logOperation<T>(
  logger: ILogger | undefined,
  name: string,
  context: LogContext,
  operation: () => Promise<T>,
  getResultContext: (result: T) => LogContext = () => ({})
): Promise<T> {
  const startedAt = Date.now();
  logger?.info(`${name} started`, context);

  try {
    const result = await operation();
    logger?.info(`${name} completed`, {
      ...context,
      ...getResultContext(result),
      durationMs: Date.now() - startedAt,
    });

    return result;
  } catch (error) {
    logger?.error(`${name} failed`, {
      ...context,
      durationMs: Date.now() - startedAt,
      error,
    });
    throw error;
  }
}
