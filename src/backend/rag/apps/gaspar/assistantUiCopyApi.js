import { getAssistantUiCopy } from '../../application/assistantUiCopy/getAssistantUiCopy.ts';
import { createApiHttp, createErrorBody } from '../../../shared/api/http.js';
import { createGasparDependencies } from '../di/createGasparDependencies.ts';
import { getRagConfig } from '../../application/ragConfig.ts';

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

export function createAssistantUiCopyApi({
  createDependencies = createGasparDependencies,
  env = process.env,
} = {}) {
  let ragConfig;
  const http = createApiHttp({ allowedMethods: ALLOWED_METHODS, env });

  function getAppConfig() {
    ragConfig ||= createDependencies === createGasparDependencies ? getRagConfig(env) : undefined;
    return ragConfig;
  }

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
        await getAssistantUiCopy(
          language,
          createDependencies({ config: getAppConfig() }).createAssistantUiCopyDependencies()
        )
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
}

export const handleAssistantUiCopy = createAssistantUiCopyApi();
