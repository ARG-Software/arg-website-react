import { createApiHttp, createErrorBody } from '../../shared/api/http.js';
import { getAdminErrorStatus } from '../application/errors.js';
import { loginAdmin } from '../application/admin/loginAdmin.js';
import { createAdminDependencies } from './di/createAdminDependencies.js';

const ADMIN_LOGIN_ALLOWED_METHODS = 'POST, OPTIONS';

export const config = {
  path: '/api/admin/login',
  method: ['POST', 'OPTIONS'],
};

export function createAdminLoginApi({
  createDependencies = createAdminDependencies,
  env = process.env,
} = {}) {
  const http = createApiHttp({ allowedMethods: ADMIN_LOGIN_ALLOWED_METHODS, env });

  return async function handleAdminLoginApi(request) {
    const response = new Response(null);

    try {
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

      const payload = await readJsonBody(request);
      const dependencies = createDependencies({ env }).createLoginDependencies();

      const result = await loginAdmin(
        {
          email: payload.email,
          password: payload.password,
          altcha: payload.altcha,
          clientIp: getClientIp(request),
          response: response,
        },
        dependencies
      );

      const jsonResponse = http.createJsonResponse(request, 200, result);

      response.headers.forEach((value, name) => {
        jsonResponse.headers.append(name, value);
      });

      return jsonResponse;
    } catch (error) {
      const statusCode = getAdminErrorStatus(error);

      if (statusCode === 500) {
        console.error(error);
      }

      const errorResponse = http.createJsonResponse(request, statusCode, getHttpErrorBody(error));

      response.headers.forEach((value, name) => {
        errorResponse.headers.append(name, value);
      });

      if (statusCode === 429 && error.retryAfterSeconds) {
        errorResponse.headers.set('Retry-After', String(error.retryAfterSeconds));
      }

      return errorResponse;
    }
  };
}

export const handleAdminLoginApi = createAdminLoginApi();

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

  return createErrorBody('admin_login_failed', 'Admin login failed');
}

function getClientIp(request) {
  return (
    request.headers.get('x-nf-client-connection-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}
