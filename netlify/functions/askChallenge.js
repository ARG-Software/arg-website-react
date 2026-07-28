import { createAltchaChallenge } from '../../rag/security/altcha.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export const config = {
  path: '/api/assistant/challenge',
  method: ['GET', 'OPTIONS'],
  rateLimit: {
    windowLimit: 30,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return createResponse(204, '');
  }

  if (request.method !== 'GET') {
    return createResponse(405, { error: { code: 'method_not_allowed', message: 'Method not allowed' } });
  }

  try {
    const challenge = await createAltchaChallenge();

    return createResponse(200, { challenge });
  } catch (error) {
    const isConfigurationError =
      error instanceof Error &&
      error.message.startsWith('Missing required environment variable:');

    if (!isConfigurationError) {
      console.error(error);
    }

    return createResponse(isConfigurationError ? 503 : 500, {
      error: {
        code: isConfigurationError ? 'configuration_error' : 'challenge_failed',
        message: isConfigurationError
          ? 'Assistant service is temporarily unavailable'
          : 'Unable to create verification challenge',
      },
    });
  }
}

function createResponse(statusCode, body) {
  const responseBody = statusCode === 204 ? null : typeof body === 'string' ? body : JSON.stringify(body);

  return new Response(responseBody, {
    status: statusCode,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  });
}
