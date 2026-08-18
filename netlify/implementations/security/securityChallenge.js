import { createGasparHumanVerificationApp } from '../../../rag/apps/gaspar/createGasparSecurityApp.ts';
import { createOriginGuardResponse } from '../common/apiOrigin.js';
import { createJsonResponse } from '../common/httpJson.js';

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

export async function handleSecurityChallenge(request) {
  const originGuardResponse = createOriginGuardResponse(request, ALLOWED_METHODS);
  if (originGuardResponse) return originGuardResponse;

  if (request.method === 'OPTIONS') {
    return createResponse(request, 204, '');
  }

  if (request.method !== 'GET') {
    return createResponse(request, 405, {
      error: { code: 'method_not_allowed', message: 'Method not allowed' },
    });
  }

  try {
    const challenge = await createGasparHumanVerificationApp().createChallenge();

    return createResponse(request, 200, challenge);
  } catch (error) {
    const isConfigurationError =
      error instanceof Error && error.message.startsWith('Missing required environment variable:');

    if (!isConfigurationError) {
      console.error(error);
    }

    return createResponse(request, isConfigurationError ? 503 : 500, {
      error: {
        code: isConfigurationError ? 'configuration_error' : 'challenge_failed',
        message: isConfigurationError
          ? 'Security verification is temporarily unavailable'
          : 'Unable to create verification challenge',
      },
    });
  }
}

function createResponse(request, statusCode, body) {
  return createJsonResponse(request, ALLOWED_METHODS, statusCode, body);
}
