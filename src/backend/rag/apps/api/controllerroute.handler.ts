import type { ControllerRoute } from '../../../shared/api/decorators/index.js';
import { createApiHttp, createErrorBody } from '../../../shared/api/http.js';
import { createRequestLogContext } from '../../../shared/api/requestlogcontext.js';
import type { ILogger } from '../../../shared/logger/ilogger.js';
import { getLogContextValue, runWithLogContext } from '../../../shared/logger/logcontext.js';

const DEFAULT_ALLOWED_ORIGINS = ['https://arg.software', 'https://www.arg.software'];

export async function dispatchControllerRoutes(
  request: Request,
  routes: ControllerRoute[],
  logger?: ILogger
): Promise<Response> {
  const { pathname } = new URL(request.url);

  return runWithLogContext(createRequestLogContext('rag', request, pathname), () =>
    dispatchWithLogContext(request, routes, pathname, logger)
  );
}

async function dispatchWithLogContext(
  request: Request,
  routes: ControllerRoute[],
  pathname: string,
  logger?: ILogger
): Promise<Response> {
  const startedAt = Date.now();
  const pathRoutes = routes.filter(r => r.path === pathname);

  logger?.info('RAG API request started');

  const allowedMethods = [...new Set(['OPTIONS', ...pathRoutes.map(r => r.method)])].join(', ');
  const http = createApiHttp({ allowedMethods, defaultAllowedOrigins: DEFAULT_ALLOWED_ORIGINS });

  const originGuard = http.createOriginGuardResponse(request);
  if (originGuard) return logResponse(logger, startedAt, originGuard);

  if (!pathRoutes.length) {
    return logResponse(
      logger,
      startedAt,
      http.createJsonResponse(request, 404, createErrorBody('not_found', 'Not found'))
    );
  }

  if (request.method === 'OPTIONS') {
    return logResponse(logger, startedAt, http.createJsonResponse(request, 204, ''));
  }

  const route = pathRoutes.find(r => r.method === request.method);

  if (!route) {
    return logResponse(
      logger,
      startedAt,
      http.createJsonResponse(
        request,
        405,
        createErrorBody('method_not_allowed', 'Method not allowed')
      )
    );
  }

  let response: Response;
  try {
    response = await route.handler(request);
  } catch (error) {
    logger?.error('RAG API request failed', {
      method: request.method,
      path: pathname,
      durationMs: Date.now() - startedAt,
      error,
    });
    throw error;
  }

  Object.entries(http.createCorsHeaders(request)).forEach(([key, value]) =>
    response.headers.set(key, value)
  );

  return logResponse(logger, startedAt, response);
}

function logResponse(
  logger: ILogger | undefined,
  startedAt: number,
  response: Response
): Response {
  const level = response.status >= 400 ? 'warn' : 'info';
  const requestId = getLogContextValue('requestId');

  if (requestId) response.headers.set('X-Request-ID', String(requestId));

  logger?.[level]('RAG API request completed', {
    status: response.status,
    durationMs: Date.now() - startedAt,
  });

  return response;
}
