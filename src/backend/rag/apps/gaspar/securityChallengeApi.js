import { createApiHttp, createErrorBody } from '../../../shared/api/http.js';
import { createGasparDependencies } from '../di/createGasparDependencies.ts';

const ALLOWED_METHODS = 'GET, OPTIONS';

export const config = {
  path: '/api/security/challenge',
  method: ['GET', 'OPTIONS'],
  rateLimit: {
    windowLimit: 30,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};

export function createSecurityChallengeApi({
  createDependencies = createGasparDependencies,
  env = process.env,
} = {}) {
  const http = createApiHttp({ allowedMethods: ALLOWED_METHODS, env });

  return async function handleSecurityChallenge(request) {
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
      const humanVerification = createDependencies({
        env,
      }).createHumanVerificationDependencies();
      const challenge = await humanVerification.createChallenge();

      return http.createJsonResponse(request, 200, challenge);
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
            ? 'Security verification is temporarily unavailable'
            : 'Unable to create verification challenge'
        )
      );
    }
  };
}

export const handleSecurityChallenge = createSecurityChallengeApi();
