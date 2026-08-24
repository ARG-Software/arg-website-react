import { authenticateAdmin } from './auth/userAuthenticator.js';
import { createAdminError, getAdminErrorStatus } from '../application/errors.js';
import { createOutreachCsvUseCase } from '../application/usecases/outreach/createOutreachCsvUseCase.js';
import { importOutreachCsvUseCase } from '../application/usecases/outreach/importOutreachCsvUseCase.js';
import { listOutreachRecordsUseCase } from '../application/usecases/outreach/listOutreachRecordsUseCase.js';
import { updateOutreachRecordUseCase } from '../application/usecases/outreach/updateOutreachRecordUseCase.js';
import { createOutreachRecordResponse } from '../domain/outreachRecord.js';
import { createApiHttp, createErrorBody } from '../../shared/api/http.js';
import { createAdminDependencies } from './di/createAdminDependencies.js';
import { getAccessToken } from '../infrastructure/http/adminCookies.js';
import { resolveAdminConfig } from './config/resolveAdminConfig.js';
import type { IAdminApiFactoryOptions } from './IAdminApiFactoryOptions.js';

export { createErrorBody };

export const ADMIN_ALLOWED_METHODS = 'GET, POST, OPTIONS';

export const config = {
  path: '/api/admin/outreach',
  method: ['GET', 'POST', 'OPTIONS'],
};

export function createAdminOutreachApi({
  createDependencies = createAdminDependencies,
  adminConfig,
  env = process.env,
}: IAdminApiFactoryOptions = {}) {
  let appConfig = adminConfig;
  const http = createApiHttp({ allowedMethods: ADMIN_ALLOWED_METHODS, env });

  function getAppConfig() {
    appConfig ||= resolveAdminConfig({
      adminConfig,
      createDependencies,
      defaultCreateDependencies: createAdminDependencies,
      env,
    });
    return appConfig;
  }

  return async function handleAdminOutreachApi(request) {
    try {
      const originGuardResponse = http.createOriginGuardResponse(request);
      if (originGuardResponse) return originGuardResponse;

      if (request.method === 'OPTIONS') {
        return http.createJsonResponse(request, 204, '');
      }

      if (!['GET', 'POST'].includes(request.method)) {
        return http.createJsonResponse(
          request,
          405,
          createErrorBody('method_not_allowed', 'Method not allowed')
        );
      }

      const dependencies = createDependencies({
        config: getAppConfig(),
      }).createOutreachDependencies();
      const user = await authenticateAdmin(getAccessToken(request), dependencies);

      if (request.method === 'GET') {
        const query = getOutreachQuery(request);
        const result = await listOutreachRecordsUseCase(query, dependencies);

        if (query.scope === 'export' && query.format === 'csv') {
          return createCsvResponse(
            request,
            http,
            createOutreachCsvUseCase((result as any).records || [])
          );
        }

        return http.createJsonResponse(request, 200, createListResponse(result));
      }

      const payload = await readJsonBody(request);

      if (payload.action === 'import') {
        const result = await importOutreachCsvUseCase(payload, dependencies);
        return http.createJsonResponse(request, 200, createListResponse(result));
      }

      const record = await updateOutreachRecordUseCase(
        {
          id: payload.id,
          changes: payload.changes,
          actorEmail: user.email,
        },
        dependencies
      );

      return http.createJsonResponse(request, 200, {
        record: createOutreachRecordResponse(record),
      });
    } catch (error) {
      const statusCode = getHttpErrorStatus(error);

      if (statusCode === 500) {
        console.error(error);
      }

      return http.createJsonResponse(request, statusCode, getHttpErrorBody(error));
    }
  };
}

export const handleAdminOutreachApi = createAdminOutreachApi();

export function createAdminResponse(request, statusCode, body, env = process.env) {
  return createApiHttp({ allowedMethods: ADMIN_ALLOWED_METHODS, env }).createJsonResponse(
    request,
    statusCode,
    body
  );
}

export function createHttpError(statusCode, code, message) {
  return createAdminError(statusCode, code, message);
}

export function getHttpErrorStatus(error) {
  return getAdminErrorStatus(error);
}

export function getHttpErrorBody(error) {
  if (error?.code && error?.statusCode) {
    return createErrorBody(error.code, error.message);
  }

  return createErrorBody('admin_request_failed', 'Admin request failed');
}

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw createAdminError(400, 'invalid_json', 'Invalid JSON body');
  }
}

function getOutreachQuery(request) {
  const params = new URL(request.url).searchParams;
  return Object.fromEntries(params.entries());
}

function createListResponse(result) {
  if (result.records) {
    return {
      ...result,
      records: result.records.map(createOutreachRecordResponse),
    };
  }

  return result;
}

function createCsvResponse(request, http, csv) {
  return new Response(csv, {
    status: 200,
    headers: {
      ...http.createCorsHeaders(request),
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="outreach-records.csv"',
    },
  });
}
