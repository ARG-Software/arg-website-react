import { randomUUID } from 'node:crypto';

import type { LogContext } from '../logger/ilogger.js';
import { getClientIp } from './http.js';

export function createRequestLogContext(service: string, request: Request, path: string): LogContext {
  return {
    requestId: getRequestId(request),
    service,
    method: request.method,
    path,
    clientIp: getClientIp(request),
    origin: request.headers.get('origin') || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
  };
}

function getRequestId(request: Request): string {
  return request.headers.get('x-request-id') || request.headers.get('x-nf-request-id') || randomUUID();
}
