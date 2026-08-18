import { createAdminApp } from '../apps/createAdminApp.js';
import { createAdminError, getAdminErrorStatus } from '../application/errors.js';
import { createOutreachRecordResponse } from '../domain/outreachRecord.js';
import { createErrorBody, createJsonResponse, createOriginGuardResponse } from './http.js';

export { createErrorBody };

export const ADMIN_ALLOWED_METHODS = 'GET, POST, OPTIONS';

export async function handleAdminOutreachApi(request, { app, env = {} } = {}) {
  try {
    const originGuardResponse = createOriginGuardResponse(request, ADMIN_ALLOWED_METHODS, env);
    if (originGuardResponse) return originGuardResponse;

    if (request.method === 'OPTIONS') {
      return createAdminResponse(request, 204, '', env);
    }

    if (!['GET', 'POST'].includes(request.method)) {
      return createAdminResponse(
        request,
        405,
        createErrorBody('method_not_allowed', 'Method not allowed'),
        env
      );
    }

    const adminApp = app || createAdminApp({ env });
    const user = await adminApp.authenticateAdmin(getBearerToken(request));

    if (request.method === 'GET') {
      const records = await adminApp.listOutreachRecords();
      return createAdminResponse(
        request,
        200,
        { records: records.map(createOutreachRecordResponse) },
        env
      );
    }

    const payload = await readJsonBody(request);
    const record = await adminApp.updateOutreachRecord({
      id: payload.id,
      changes: payload.changes,
      actorEmail: user.email,
    });

    return createAdminResponse(request, 200, { record: createOutreachRecordResponse(record) }, env);
  } catch (error) {
    const statusCode = getHttpErrorStatus(error);

    if (statusCode === 500) {
      console.error(error);
    }

    return createAdminResponse(request, statusCode, getHttpErrorBody(error), env);
  }
}

export function createAdminResponse(request, statusCode, body, env = {}) {
  return createJsonResponse(request, ADMIN_ALLOWED_METHODS, statusCode, body, env);
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
