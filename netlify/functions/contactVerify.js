import { verifyAltchaPayload } from '../../rag/security/altcha.ts';
import { createCorsHeaders, createOriginGuardResponse } from '../shared/apiOrigin.js';

const ALLOWED_METHODS = 'POST, OPTIONS';

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
  const originGuardResponse = createOriginGuardResponse(request, ALLOWED_METHODS);
  if (originGuardResponse) return originGuardResponse;

  if (request.method === 'OPTIONS') {
    return createResponse(request, 204, '');
  }

  if (request.method !== 'POST') {
    return createResponse(
      request,
      405,
      createErrorBody('method_not_allowed', 'Method not allowed')
    );
  }

  let altcha;

  try {
    altcha = (await request.json()).altcha;
  } catch {
    return createResponse(request, 400, createErrorBody('invalid_json', 'Invalid JSON body'));
  }

  try {
    if (!altcha) {
      return createResponse(
        request,
        403,
        createErrorBody('bot_verification_failed', 'Verification required')
      );
    }

    const altchaResult = await verifyAltchaPayload(String(altcha));

    if (!altchaResult.verified) {
      return createResponse(
        request,
        403,
        createErrorBody('bot_verification_failed', 'Verification failed')
      );
    }
  } catch {
    return createResponse(
      request,
      403,
      createErrorBody('bot_verification_failed', 'Verification failed')
    );
  }

  return createResponse(request, 200, { verified: true });
}

function createErrorBody(code, message) {
  return {
    error: {
      code,
      message,
    },
  };
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
