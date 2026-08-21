import { createApiHttp, createErrorBody } from '../../shared/api/http.js';
import { getAdminErrorStatus } from '../application/errors.js';
import {
  getAdminSession,
  refreshAdminSession,
  signOutAdmin,
} from '../application/admin/sessionAdmin.js';
import {
  getAccessToken,
  getRefreshToken,
  setSessionCookies,
  clearSessionCookies,
} from '../infrastructure/http/adminCookies.js';
import { createAdminDependencies } from './di/createAdminDependencies.js';

const ALLOWED_METHODS = 'GET, POST, DELETE, OPTIONS';

export const config = {
  path: '/api/admin/session',
  method: ['GET', 'POST', 'DELETE', 'OPTIONS'],
};

export function createAdminSessionApi({
  createDependencies = createAdminDependencies,
  env = process.env,
} = {}) {
  const http = createApiHttp({ allowedMethods: ALLOWED_METHODS, env });

  return async function handleAdminSessionApi(request) {
    const response = new Response(null);
    let body = null;
    let statusCode = 200;

    try {
      const originGuardResponse = http.createOriginGuardResponse(request);
      if (originGuardResponse) return originGuardResponse;

      if (request.method === 'OPTIONS') {
        return http.createJsonResponse(request, 204, '');
      }

      const dependencies = createDependencies({ env }).createSessionDependencies();

      if (request.method === 'GET') {
        const result = await getAdminSession(
          {
            accessToken: getAccessToken(request),
            refreshToken: getRefreshToken(request),
          },
          dependencies
        );

        if (result.session) {
          setSessionCookies(
            response,
            {
              accessToken: result.session.access_token,
              refreshToken: result.session.refresh_token,
            },
            env
          );
        }

        body = { user: result.user };
      } else if (request.method === 'POST') {
        const result = await refreshAdminSession(getRefreshToken(request), dependencies);

        setSessionCookies(
          response,
          {
            accessToken: result.session.access_token,
            refreshToken: result.session.refresh_token,
          },
          env
        );

        body = { user: result.user };
      } else if (request.method === 'DELETE') {
        await signOutAdmin(getAccessToken(request), dependencies);
        clearSessionCookies(response);
        statusCode = 204;
      } else {
        return http.createJsonResponse(
          request,
          405,
          createErrorBody('method_not_allowed', 'Method not allowed')
        );
      }

      const jsonResponse = http.createJsonResponse(
        request,
        statusCode,
        statusCode === 204 ? '' : body
      );

      response.headers.forEach((value, name) => {
        jsonResponse.headers.append(name, value);
      });

      return jsonResponse;
    } catch (error) {
      statusCode = getAdminErrorStatus(error);

      if (statusCode === 500) {
        console.error(error);
      }

      const errorResponse = http.createJsonResponse(request, statusCode, getHttpErrorBody(error));

      response.headers.forEach((value, name) => {
        errorResponse.headers.append(name, value);
      });

      return errorResponse;
    }
  };
}

export const handleAdminSessionApi = createAdminSessionApi();

function getHttpErrorBody(error) {
  if (error?.code && error?.statusCode) {
    return createErrorBody(error.code, error.message);
  }

  return createErrorBody('admin_session_failed', 'Session operation failed');
}
