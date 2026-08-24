import { createApiHttp, createErrorBody } from '../../shared/api/http.js';
import { getAdminErrorStatus } from '../application/errors.js';
import { updateAdminUser } from './auth/updateAdminUser.js';
import { getAccessToken } from '../infrastructure/http/adminCookies.js';
import { createAdminDependencies } from './di/createAdminDependencies.js';
import { resolveAdminConfig } from './config/resolveAdminConfig.js';
import type { IAdminApiFactoryOptions } from './IAdminApiFactoryOptions.js';

const ALLOWED_METHODS = 'PATCH, OPTIONS';

export const config = {
  path: '/api/admin/user',
  method: ['PATCH', 'OPTIONS'],
};

export function createAdminUserApi({
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

      const payload = await http.readJsonBody(request, { fallback: {}, trimStrings: false });
      const dependencies = createDependencies({ config: getAppConfig() }).createSessionDependencies();

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

function getHttpErrorBody(error) {
  if (error?.code && getAdminErrorStatus(error) !== 500) {
    return createErrorBody(error.code, error.message);
  }

  return createErrorBody('admin_user_update_failed', 'User update failed');
}
