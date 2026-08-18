import { createGasparHumanVerificationApp } from '../apps/gaspar/createGasparSecurityApp.ts';
import { createApiHttp, createErrorBody } from '../../shared/api/http.js';

const ALLOWED_METHODS = 'GET, OPTIONS';

export const config = {
  path: '/api/assistant/challenge',
  method: ['GET', 'OPTIONS'],
  rateLimit: {
    windowLimit: 30,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};

export function createAssistantChallengeApi({ env = process.env, humanVerificationApp } = {}) {
  const http = createApiHttp({ allowedMethods: ALLOWED_METHODS, env });

  return async function handleAssistantChallenge(request) {
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
      const challenge = await getHumanVerificationApp().createChallenge();

      return http.createJsonResponse(request, 200, { challenge });
    } catch (error) {
      const isConfigurationError =
        error instanceof Error &&
        error.message.startsWith('Missing required environment variable:');

      if (!isConfigurationError) {
        console.error(error);
      }

      return http.createJsonResponse(
        request,
        isConfigurationError ? 503 : 500,
        createErrorBody(
          isConfigurationError ? 'configuration_error' : 'challenge_failed',
          isConfigurationError
            ? 'Assistant service is temporarily unavailable'
            : 'Unable to create verification challenge'
        )
      );
    }
  };

  function getHumanVerificationApp() {
    return humanVerificationApp || createGasparHumanVerificationApp({ env });
  }
}

export const handleAssistantChallenge = createAssistantChallengeApi();
