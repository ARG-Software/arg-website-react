import { verifyAltchaPayload } from '../../rag/security/altcha.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const config = {
  path: '/api/contact/verify',
  method: ['POST', 'OPTIONS'],
  rateLimit: {
    windowLimit: 10,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return createResponse(204, '');
  }

  if (request.method !== 'POST') {
    return createResponse(405, createErrorBody('method_not_allowed', 'Method not allowed'));
  }

  let altcha;

  try {
    altcha = (await request.json()).altcha;
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
  const responseBody = statusCode === 204 ? null : typeof body === 'string' ? body : JSON.stringify(body);

  return new Response(responseBody, {
    status: statusCode,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  });
}
