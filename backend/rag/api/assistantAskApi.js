import { RagValidationError } from '../application/ask/askQuestion.ts';
import { EmbeddingQuotaExceededError } from '../application/ports/ProviderErrors.ts';
import { createGasparApp } from '../apps/gaspar/createGasparApp.ts';
import {
  createGasparAskRateLimiterApp,
  createGasparHumanVerificationApp,
} from '../apps/gaspar/createGasparSecurityApp.ts';
import { createApiHttp, createErrorBody } from '../../shared/api/http.js';

const ALLOWED_METHODS = 'POST, OPTIONS';

export const config = {
  path: '/api/assistant/ask',
  method: ['POST', 'OPTIONS'],
  rateLimit: {
    windowLimit: 6,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};

export function createAssistantAskApi({
  askRateLimiterApp,
  env = process.env,
  gasparApp,
  humanVerificationApp,
} = {}) {
  const http = createApiHttp({ allowedMethods: ALLOWED_METHODS, env });
  let askRateLimiter = askRateLimiterApp;

  return async function handleAssistantAsk(request) {
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

    let payload;

    try {
      payload = await request.json();
    } catch {
      return http.createJsonResponse(
        request,
        400,
        createErrorBody('invalid_json', 'Invalid JSON body')
      );
    }

    try {
      if (!payload.altcha?.challenge || !payload.altcha?.solution) {
        return http.createJsonResponse(
          request,
          403,
          createErrorBody('bot_verification_failed', 'Verification required')
        );
      }

      const altchaResult = await getHumanVerificationApp().verifyChallenge({
        challenge: payload.altcha.challenge,
        solution: payload.altcha.solution,
      });

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

    const clientIp = request.headers.get('x-nf-client-connection-ip') || 'unknown';

    try {
      const rateLimitResult = await getAskRateLimiter().check(clientIp);

      if (!rateLimitResult.allowed) {
        return http.createJsonResponse(
          request,
          429,
          createErrorBody('rate_limited', 'Too many requests. Please try again later.')
        );
      }
    } catch (error) {
      console.error('Rate limit check failed, failing open:', error);
    }

    try {
      const result = await getGasparApp().askQuestion({
        question: payload.question,
        messages: payload.messages,
        pageContext: payload.pageContext,
        preferredLanguage: payload.preferredLanguage,
      });

      return http.createJsonResponse(request, 200, {
        answer: result.answer,
        language: result.language,
        languagePreference: result.languagePreference,
        citations: result.citations,
        articleRecommendations: result.articleRecommendations,
        actions: result.actions,
      });
    } catch (error) {
      const statusCode = isServiceUnavailable(error) ? 503 : isClientError(error) ? 400 : 500;
      const errorBody =
        statusCode === 400 || statusCode === 503
          ? createErrorBody(
              getServiceErrorCode(error),
              statusCode === 503 ? 'Assistant service is temporarily unavailable' : error.message
            )
          : createErrorBody('answer_failed', 'Unable to answer the question');

      if (statusCode === 500) {
        console.error(error);
      }

      return http.createJsonResponse(request, statusCode, errorBody);
    }
  };

  function getGasparApp() {
    return gasparApp || createGasparApp({ env });
  }

  function getHumanVerificationApp() {
    return humanVerificationApp || createGasparHumanVerificationApp({ env });
  }

  function getAskRateLimiter() {
    if (!askRateLimiter) {
      askRateLimiter = createGasparAskRateLimiterApp({ env });
    }

    return askRateLimiter;
  }
}

export const handleAssistantAsk = createAssistantAskApi();

function isClientError(error) {
  return error instanceof RagValidationError;
}

function isServiceUnavailable(error) {
  return isConfigurationError(error) || error instanceof EmbeddingQuotaExceededError;
}

function isConfigurationError(error) {
  return (
    error instanceof Error && error.message.startsWith('Missing required environment variables:')
  );
}

function getServiceErrorCode(error) {
  if (error instanceof EmbeddingQuotaExceededError) {
    return error.code;
  }

  return 'configuration_error';
}
