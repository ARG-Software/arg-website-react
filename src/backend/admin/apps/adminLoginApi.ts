import { createApiHttp, createErrorBody } from '../../shared/api/http.js';
import { getAdminErrorStatus } from '../application/errors.js';
import { loginAdmin } from './auth/userLogin.js';
import { createAdminDependencies } from './di/createAdminDependencies.js';
import { setSessionCookies } from '../infrastructure/http/adminCookies.js';
import { resolveAdminConfig } from './config/resolveAdminConfig.js';
import type { IAdminApiFactoryOptions } from './IAdminApiFactoryOptions.js';

const ADMIN_LOGIN_ALLOWED_METHODS = 'POST, OPTIONS';

export const config = {
  path: '/api/admin/login',
  method: ['POST', 'OPTIONS'],
};

export function createAdminLoginApi({
  createDependencies = createAdminDependencies,
  adminConfig,
  env = process.env,
}: IAdminApiFactoryOptions = {}) {
  let appConfig = adminConfig;
  const http = createApiHttp({ allowedMethods: ADMIN_LOGIN_ALLOWED_METHODS, env });

  function getAppConfig() {
    appConfig ||= resolveAdminConfig({
      adminConfig,
      createDependencies,
      defaultCreateDependencies: createAdminDependencies,
      env,
    });
    return appConfig;
  }

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

      const payload = await http.readJsonBody(request, { fallback: {}, trimStrings: false });
      const dependencies = createDependencies({ config: getAppConfig() }).createLoginDependencies();

      const result = await loginAdmin(
        {
          email: payload.email,
          password: payload.password,
          altcha: payload.altcha,
          clientIp: getClientIp(request),
        },
        dependencies
      );

      setSessionCookies(
        response,
        {
          accessToken: result.session.access_token,
          refreshToken: result.session.refresh_token,
        },
        dependencies.secureCookies
      );

      const jsonResponse = http.createJsonResponse(request, 200, { user: result.user });

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

function getHttpErrorBody(error) {
  if (error?.code && getAdminErrorStatus(error) !== 500) {
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
