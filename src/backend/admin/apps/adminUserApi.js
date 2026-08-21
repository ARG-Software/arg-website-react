import { createApiHttp, createErrorBody } from '../../shared/api/http.js';
import { getAdminErrorStatus } from '../application/errors.js';
import { updateAdminUser } from '../application/admin/sessionAdmin.js';
import { getAccessToken } from '../infrastructure/http/adminCookies.js';
import { createAdminDependencies } from './di/createAdminDependencies.js';

const ALLOWED_METHODS = 'PATCH, OPTIONS';

export const config = {
  path: '/api/admin/user',
  method: ['PATCH', 'OPTIONS'],
};

export function createAdminUserApi({
  createDependencies = createAdminDependencies,
  env = process.env,
} = {}) {
  const http = createApiHttp({ allowedMethods: ALLOWED_METHODS, env });

  return async function handleAdminUserApi(request) {
    try {
      const originGuardResponse = http.createOriginGuardResponse(request);
      if (originGuardResponse) return originGuardResponse;

      if (request.method === 'OPTIONS') {
        return http.createJsonResponse(request, 204, '');
      }

      if (request.method !== 'PATCH') {
        return http.createJsonResponse(
          request,
          405,
          createErrorBody('method_not_allowed', 'Method not allowed')
        );
      }

      const payload = await readJsonBody(request);
      const dependencies = createDependencies({ env }).createSessionDependencies();

      const result = await updateAdminUser(
        {
          accessToken: getAccessToken(request),
          name: payload.name,
          password: payload.password,
        },
        dependencies
      );

      return http.createJsonResponse(request, 200, result);
    } catch (error) {
      const statusCode = getAdminErrorStatus(error);

      if (statusCode === 500) {
        console.error(error);
      }

      return http.createJsonResponse(request, statusCode, getHttpErrorBody(error));
    }
  };
}

export const handleAdminUserApi = createAdminUserApi();

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function getHttpErrorBody(error) {
  if (error?.code && error?.statusCode) {
    return createErrorBody(error.code, error.message);
  }

  return createErrorBody('admin_user_update_failed', 'User update failed');
}
