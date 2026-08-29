import { AsyncLocalStorage } from 'node:async_hooks';

import type { LogContext } from './ilogger.js';

const storage = new AsyncLocalStorage<LogContext>();

export function runWithLogContext<T>(context: LogContext, callback: () => T): T {
  return storage.run(context, callback);
}

export function getLogContext(): LogContext {
  return storage.getStore() ?? {};
}

export function getLogContextValue(name: string): unknown {
  return getLogContext()[name];
}
