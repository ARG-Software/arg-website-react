import { createGasparApp } from '../apps/gaspar/createGasparApp.ts';
import { createApiHttp, createErrorBody } from '../../shared/api/http.js';

const ALLOWED_METHODS = 'GET, OPTIONS';

export const config = {
  path: '/api/assistant/ui-copy',
  method: ['GET', 'OPTIONS'],
  rateLimit: {
    windowLimit: 20,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};

export function createAssistantUiCopyApi({ env = process.env, gasparApp } = {}) {
  const http = createApiHttp({ allowedMethods: ALLOWED_METHODS, env });

  return async function handleAssistantUiCopy(request) {
    const originGuardResponse = http.createOriginGuardResponse(request);
    if (originGuardResponse) return originGuardResponse;

    if (request.method === 'OPTIONS') {
      return http.createJsonResponse(request, 204, '');
    }

    if (request.method !== 'GET') {
      return http.createJsonResponse(
        request,
        405,
        createErrorBody('method_not_allowed', 'Method not allowed')
      );
    }

    try {
      const url = new URL(request.url);
      const language = url.searchParams.get('language') || 'en';
      return http.createJsonResponse(
        request,
        200,
        await getGasparApp().getAssistantUiCopy(language)
      );
    } catch (error) {
      console.error(error);
      return http.createJsonResponse(
        request,
        503,
        createErrorBody(
          'translation_unavailable',
          'Assistant UI translation is temporarily unavailable'
        )
      );
    }
  };

  function getGasparApp() {
    return gasparApp || createGasparApp({ env });
  }
}

export const handleAssistantUiCopy = createAssistantUiCopyApi();
