import { createGasparHumanVerificationApp } from '../../../rag/apps/gaspar/createGasparSecurityApp.ts';
import { createOriginGuardResponse } from '../common/apiOrigin.js';
import { createErrorBody, createJsonResponse } from '../common/httpJson.js';

const ALLOWED_METHODS = 'POST, OPTIONS';

export const config = {
  path: '/api/security/verify',
  method: ['POST', 'OPTIONS'],
  rateLimit: {
    windowLimit: 10,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};

export async function handleSecurityVerify(request) {
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

    const altchaResult = await createGasparHumanVerificationApp().verifyPayload(String(altcha));

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

function createResponse(request, statusCode, body) {
  return createJsonResponse(request, ALLOWED_METHODS, statusCode, body);
}
