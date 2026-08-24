import crypto from 'node:crypto';

import { VisitSession } from '../domain/visit.js';
import { VisitDomainError } from '../domain/errors/VisitDomainError.js';
import { getAdminErrorStatus } from '../application/errors.js';
import { checkRateLimits } from '../../shared/security/rateLimit.js';
import { createApiHttp, createErrorBody } from '../../shared/api/http.js';
import { createAdminDependencies } from './di/createAdminDependencies.js';
import { resolveAdminConfig } from './config/resolveAdminConfig.js';
import type { IAdminApiFactoryOptions } from './IAdminApiFactoryOptions.js';

const ALLOWED_METHODS = 'POST, OPTIONS';

export const config = {
  path: '/api/visit-log',
  method: ['POST', 'OPTIONS'],
};

export function createVisitLogApi({
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

  return async function handleVisitLogApi(request) {
    const originGuardResponse = http.createOriginGuardResponse(request);
    if (originGuardResponse) return originGuardResponse;

    if (request.method === 'OPTIONS') {
      return http.createJsonResponse(request, 204, '');
    }

    if (request.method !== 'POST') {
      return http.createJsonResponse(
        request,
        405,
        createErrorBody('method_not_allowed', 'Method not allowed')
      );
    }

    const dependencies = createDependencies({ config: getAppConfig() }).createVisitIngestDependencies();
    const rateLimitResponse = await createRateLimitResponse(request, dependencies, http);
    if (rateLimitResponse) return rateLimitResponse;

    try {
      const payload = await http.readJsonBody(request);
      if (!payload.sessionId) throw VisitDomainError.missingSessionId();

      const clientIp = getClientIp(request);
      const geo = await dependencies.geolocationProvider.lookup(clientIp, request.headers);
      const record = new VisitSession({
        sessionHash: crypto
          .createHmac('sha256', dependencies.visitHashKey)
          .update(payload.sessionId)
          .digest('hex')
          .slice(0, 16),
        events: payload.events,
        pageViews: payload.pageViews,
        geo,
        language: payload.language,
        referrer: payload.referrer,
      });
      await dependencies.visitRepository.recordSession(record);

      return http.createJsonResponse(request, 204, '');
    } catch (error) {
      const statusCode = getAdminErrorStatus(error);

      if (statusCode === 500) {
        console.error(error);
      }

      return http.createJsonResponse(request, statusCode, getVisitLogErrorBody(error));
    }
  };
}

export const handleVisitLog = createVisitLogApi();

async function createRateLimitResponse(request, dependencies, http) {
  try {
    const rateLimitResult = await checkRateLimits(
      getClientIp(request),
      dependencies.visitRateLimit.store,
      dependencies.visitRateLimit.config
    );

    if (!rateLimitResult.allowed) {
      return http.createJsonResponse(
        request,
        429,
        createErrorBody('rate_limited', 'Too many requests. Please try again later.')
      );
    }
  } catch (error) {
    console.error('Visit log rate limit check failed, failing open:', error);
  }

  return null;
}

function getClientIp(request) {
  return request.headers.get('x-nf-client-connection-ip') || 'unknown';
}

function getVisitLogErrorBody(error) {
  if (error?.code && getAdminErrorStatus(error) !== 500) {
    return createErrorBody(error.code, error.message);
  }

  return createErrorBody('visit_log_failed', 'Unable to log visit');
}
