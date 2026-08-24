import { authenticateAdmin } from './auth/userAuthenticator.js';
import { getAdminErrorStatus } from '../application/errors.js';
import { listVisitJourneyUseCase } from '../application/usecases/visits/listVisitJourneyUseCase.js';
import { listVisitMetricsUseCase } from '../application/usecases/visits/listVisitMetricsUseCase.js';
import { listVisitSessionsUseCase } from '../application/usecases/visits/listVisitSessionsUseCase.js';
import { createApiHttp, createErrorBody } from '../../shared/api/http.js';
import { getAccessToken } from '../infrastructure/http/adminCookies.js';
import { createAdminDependencies } from './di/createAdminDependencies.js';
import { resolveAdminConfig } from './config/resolveAdminConfig.js';
import type { IAdminApiFactoryOptions } from './IAdminApiFactoryOptions.js';

const ALLOWED_METHODS = 'GET, OPTIONS';
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

export const config = {
  path: '/api/admin/visit-metrics',
  method: ['GET', 'OPTIONS'],
};

export function createVisitMetricsApi({
  createDependencies = createAdminDependencies,
  adminConfig,
  env = process.env,
}: IAdminApiFactoryOptions = {}) {
  let appConfig = adminConfig;
  const http = createApiHttp({ allowedMethods: ALLOWED_METHODS, env });

  function getAppConfig() {
    appConfig ||= resolveAdminConfig({
      adminConfig,
      createDependencies,
      defaultCreateDependencies: createAdminDependencies,
      env,
    });
    return appConfig;
  }

  return async function handleVisitMetricsApi(request) {
    try {
      const originGuardResponse = http.createOriginGuardResponse(request);
      if (originGuardResponse) return originGuardResponse;

      if (request.method === 'OPTIONS') {
        return http.createJsonResponse(request, 204, '');
      }

      if (request.method !== 'GET') {
        return http.createJsonResponse(
          request,
          405,
          createErrorBody('method_not_allowed', 'Method not allowed')
        );
      }

      const dependencies = createDependencies({
        config: getAppConfig(),
      }).createVisitAdminDependencies();
      await authenticateAdmin(getAccessToken(request), dependencies);

      const query = http.readSearchParams(request);
      const scope = query.scope || 'metrics';

      if (scope === 'sessions') {
        return http.createJsonResponse(
          request,
          200,
          await listVisitSessionsUseCase(dependencies.visitRepository, getPagination(query))
        );
      }

      if (scope === 'journey') {
        return http.createJsonResponse(
          request,
          200,
          await listVisitJourneyUseCase(
            dependencies.visitRepository,
            query.sessionHash || ''
          )
        );
      }

      return http.createJsonResponse(
        request,
        200,
        await listVisitMetricsUseCase(
          dependencies.visitRepository,
          query.range || '30d'
        )
      );
    } catch (error) {
      const statusCode = getAdminErrorStatus(error);

      if (statusCode === 500) {
        console.error(error);
      }

      return http.createJsonResponse(request, statusCode, getVisitMetricsErrorBody(error));
    }
  };
}

export const handleVisitMetrics = createVisitMetricsApi();

function getPagination(query) {
  return {
    page: clampNumber(query.page, DEFAULT_PAGE, Number.MAX_SAFE_INTEGER, DEFAULT_PAGE),
    pageSize: clampNumber(query.pageSize, 1, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE),
  };
}

function clampNumber(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

function getVisitMetricsErrorBody(error) {
  if (error?.code && getAdminErrorStatus(error) !== 500) {
    return createErrorBody(error.code, error.message);
  }

  return createErrorBody('visit_metrics_request_failed', 'Admin request failed');
}
