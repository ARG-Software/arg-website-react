import { createAltchaChallenge } from '../../rag/security/altcha.ts';
import { createCorsHeaders, createOriginGuardResponse } from '../shared/apiOrigin.js';

const ALLOWED_METHODS = 'GET, OPTIONS';

export const config = {
  path: '/api/contact/challenge',
  method: ['GET', 'OPTIONS'],
  rateLimit: {
    windowLimit: 30,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};

export default async function handler(request) {
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
    const challenge = await createAltchaChallenge();

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
          ? 'Contact verification is temporarily unavailable'
          : 'Unable to create verification challenge',
      },
    });
  }
}

function createResponse(request, statusCode, body) {
  const responseBody =
    statusCode === 204 ? null : typeof body === 'string' ? body : JSON.stringify(body);

  return new Response(responseBody, {
    status: statusCode,
    headers: {
      ...createCorsHeaders(request, ALLOWED_METHODS),
      'Content-Type': 'application/json',
    },
  });
}
