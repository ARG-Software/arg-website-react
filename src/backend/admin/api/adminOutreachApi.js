import { createAdminApp } from '../apps/createAdminApp.js';
import { createAdminError, getAdminErrorStatus } from '../application/errors.js';
import { createOutreachRecordResponse } from '../domain/outreachRecord.js';
import { createApiHttp, createErrorBody } from '../../shared/api/http.js';

export { createErrorBody };

export const ADMIN_ALLOWED_METHODS = 'GET, POST, OPTIONS';

export const config = {
  path: '/api/admin/outreach',
  method: ['GET', 'POST', 'OPTIONS'],
};

export function createAdminOutreachApi({ app, env = process.env } = {}) {
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

      const adminApp = app || createAdminApp({ env });
      const user = await adminApp.authenticateAdmin(getBearerToken(request));

      if (request.method === 'GET') {
        const records = await adminApp.listOutreachRecords();
        return http.createJsonResponse(request, 200, {
          records: records.map(createOutreachRecordResponse),
        });
      }

      const payload = await readJsonBody(request);
      const record = await adminApp.updateOutreachRecord({
        id: payload.id,
        changes: payload.changes,
        actorEmail: user.email,
      });

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
