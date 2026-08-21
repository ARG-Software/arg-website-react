import { authenticateAdmin } from '../application/admin/authenticateAdmin.js';
import { createAdminError, getAdminErrorStatus } from '../application/errors.js';
import { listOutreachRecords } from '../application/outreach/listOutreachRecords.js';
import { createOutreachCsv, importOutreachCsv } from '../application/outreach/outreachCsv.js';
import { updateOutreachRecord } from '../application/outreach/updateOutreachRecord.js';
import { createOutreachRecordResponse } from '../domain/outreachRecord.js';
import { createApiHttp, createErrorBody } from '../../shared/api/http.js';
import { createAdminDependencies } from './di/createAdminDependencies.js';

export { createErrorBody };

export const ADMIN_ALLOWED_METHODS = 'GET, POST, OPTIONS';

export const config = {
  path: '/api/admin/outreach',
  method: ['GET', 'POST', 'OPTIONS'],
};

export function createAdminOutreachApi({
  createDependencies = createAdminDependencies,
  env = process.env,
} = {}) {
  const http = createApiHttp({ allowedMethods: ADMIN_ALLOWED_METHODS, env });

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

      const dependencies = createDependencies({ env }).createOutreachDependencies();
      const user = await authenticateAdmin(getBearerToken(request), dependencies);

      if (request.method === 'GET') {
        const query = getOutreachQuery(request);
        const result = await listOutreachRecords(query, dependencies);

        if (query.scope === 'export' && query.format === 'csv') {
          return createCsvResponse(request, http, createOutreachCsv(result.records || []));
        }

        return http.createJsonResponse(request, 200, createListResponse(result));
      }

      const payload = await readJsonBody(request);

      if (payload.action === 'import') {
        const result = await importOutreachCsv(payload, dependencies);
        return http.createJsonResponse(request, 200, createListResponse(result));
      }

      const record = await updateOutreachRecord(
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

function getBearerToken(request) {
  const authorization = request.headers.get('authorization') || '';
  const [, token] = authorization.match(/^Bearer\s+(.+)$/i) || [];
  return token || '';
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
