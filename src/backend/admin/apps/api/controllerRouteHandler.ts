import type { ControllerRoute } from '../../../shared/api/decorators.js';
import { createApiHttp, createErrorBody } from '../../../shared/api/http.js';

export async function dispatchControllerRoutes(
  request: Request,
  routes: ControllerRoute[]
): Promise<Response> {
  const { pathname } = new URL(request.url);
  const pathRoutes = routes.filter(r => r.path === pathname);

  const allowedMethods = [...new Set(['OPTIONS', ...pathRoutes.map(r => r.method)])].join(', ');
  const http = createApiHttp({ allowedMethods });

  const originGuard = http.createOriginGuardResponse(request);
  if (originGuard) return originGuard;

  if (!pathRoutes.length) {
    return http.createJsonResponse(request, 404, createErrorBody('not_found', 'Not found'));
  }

  if (request.method === 'OPTIONS') {
    return http.createJsonResponse(request, 204, '');
  }

  const route = pathRoutes.find(r => r.method === request.method);

  if (!route) {
    return http.createJsonResponse(
      request,
      405,
      createErrorBody('method_not_allowed', 'Method not allowed')
    );
  }

  const response = await route.handler(request);

  Object.entries(http.createCorsHeaders(request)).forEach(([key, value]) =>
    response.headers.set(key, value)
  );

  return response;
}
