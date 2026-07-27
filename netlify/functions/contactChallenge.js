import { createAltchaChallenge } from '../../rag/security/altcha.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export const config = {
  path: '/.netlify/functions/contact-challenge',
  rateLimit: {
    windowLimit: 30,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(204, '');
  }

  if (event.httpMethod !== 'GET') {
    return createResponse(405, { error: { code: 'method_not_allowed', message: 'Method not allowed' } });
  }

  try {
    const challenge = await createAltchaChallenge();

    return createResponse(200, challenge);
  } catch (error) {
    const isConfigurationError =
      error instanceof Error && error.message.startsWith('Missing required environment variable:');

    if (!isConfigurationError) {
      console.error(error);
    }

    return createResponse(isConfigurationError ? 503 : 500, {
      error: {
        code: isConfigurationError ? 'configuration_error' : 'challenge_failed',
        message: isConfigurationError
          ? 'Contact verification is temporarily unavailable'
          : 'Unable to create verification challenge',
      },
    });
  }
}

function createResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
}
