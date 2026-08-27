import type { ILogger, LogContext } from './ilogger.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class ConsoleLogger implements ILogger {
  debug(message: string, context: LogContext = {}): void {
    this.write('debug', message, context);
  }

  info(message: string, context: LogContext = {}): void {
    this.write('info', message, context);
  }

  warn(message: string, context: LogContext = {}): void {
    this.write('warn', message, context);
  }

  error(message: string, context: LogContext = {}): void {
    this.write('error', message, context);
  }

  private write(level: LogLevel, message: string, context: LogContext): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
    };

    try {
      console.log(JSON.stringify(entry, replaceError));
    } catch {
      console.log(JSON.stringify({ timestamp: entry.timestamp, level, message }));
    }
  }
}

function replaceError(_key: string, value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      ...Object.fromEntries(
        Object.entries(value).filter(([, item]) => typeof item !== 'function')
      ),
    };
  }

  return value;
}
