import { createGasparHumanVerificationApp } from '../apps/gaspar/createGasparSecurityApp.ts';
import { createApiHttp, createErrorBody } from '../../shared/api/http.js';

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

export function createSecurityVerifyApi({ env = process.env, humanVerificationApp } = {}) {
  const http = createApiHttp({ allowedMethods: ALLOWED_METHODS, env });

  return async function handleSecurityVerify(request) {
    const originGuardResponse = http.createOriginGuardResponse(request);
    if (originGuardResponse) return originGuardResponse;

    if (request.method === 'OPTIONS') {
      return http.createJsonResponse(request, 204, '');
    }

    if (request.method !== 'POST') {
      return http.createJsonResponse(
        request,
        405,
        createErrorBody('method_not_allowed', 'Method not allowed')
      );
    }

    let altcha;

    try {
      altcha = (await request.json()).altcha;
    } catch {
      return http.createJsonResponse(
        request,
        400,
        createErrorBody('invalid_json', 'Invalid JSON body')
      );
    }

    try {
      if (!altcha) {
        return http.createJsonResponse(
          request,
          403,
          createErrorBody('bot_verification_failed', 'Verification required')
        );
      }

      const altchaResult = await getHumanVerificationApp().verifyPayload(String(altcha));

      if (!altchaResult.verified) {
        return http.createJsonResponse(
          request,
          403,
          createErrorBody('bot_verification_failed', 'Verification failed')
        );
      }
    } catch {
      return http.createJsonResponse(
        request,
        403,
        createErrorBody('bot_verification_failed', 'Verification failed')
      );
    }

    return http.createJsonResponse(request, 200, { verified: true });
  };

  function getHumanVerificationApp() {
    return humanVerificationApp || createGasparHumanVerificationApp({ env });
  }
}

export const handleSecurityVerify = createSecurityVerifyApi();
