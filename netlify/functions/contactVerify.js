import { verifyAltchaPayload } from '../../rag/security/altcha.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const config = {
  path: '/.netlify/functions/contact-verify',
  rateLimit: {
    windowLimit: 10,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(204, '');
  }

  if (event.httpMethod !== 'POST') {
    return createResponse(405, createErrorBody('method_not_allowed', 'Method not allowed'));
  }

  let altcha;

  try {
    altcha = JSON.parse(event.body || '{}').altcha;
  } catch {
    return createResponse(400, createErrorBody('invalid_json', 'Invalid JSON body'));
  }

  try {
    if (!altcha) {
      return createResponse(403, createErrorBody('bot_verification_failed', 'Verification required'));
    }

    const altchaResult = await verifyAltchaPayload(String(altcha));

    if (!altchaResult.verified) {
      return createResponse(403, createErrorBody('bot_verification_failed', 'Verification failed'));
    }
  } catch {
    return createResponse(403, createErrorBody('bot_verification_failed', 'Verification failed'));
  }

  return createResponse(200, { verified: true });
}

function createErrorBody(code, message) {
  return {
    error: {
      code,
      message,
    },
  };
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
