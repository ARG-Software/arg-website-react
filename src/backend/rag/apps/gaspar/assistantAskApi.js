import { askQuestion, RagValidationError } from '../../application/ask/askQuestion.ts';
import { EmbeddingQuotaExceededError } from '../../application/ports/ProviderErrors.ts';
import { checkRateLimits } from '../../infrastructure/security/rateLimit.ts';
import { createApiHttp, createErrorBody } from '../../../shared/api/http.js';
import { createGasparDependencies } from '../di/createGasparDependencies.ts';
import { getRagConfig } from '../../application/ragConfig.ts';

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
  createDependencies = createGasparDependencies,
  env = process.env,
} = {}) {
  let ragConfig;
  const http = createApiHttp({ allowedMethods: ALLOWED_METHODS, env });

  function getAppConfig() {
    ragConfig ||= createDependencies === createGasparDependencies ? getRagConfig(env) : undefined;
    return ragConfig;
  }

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

    const dependencies = createDependencies({ config: getAppConfig() });

    try {
      if (!payload.altcha?.challenge || !payload.altcha?.solution) {
        return http.createJsonResponse(
          request,
          403,
          createErrorBody('bot_verification_failed', 'Verification required')
        );
      }

      const humanVerification = dependencies.createHumanVerificationDependencies();
      const altchaResult = await humanVerification.verifyChallenge({
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
      const rateLimitDependencies = dependencies.createRateLimitDependencies();
      const rateLimitResult = await checkRateLimits(
        clientIp,
        rateLimitDependencies.store,
        rateLimitDependencies.config
      );

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
      const result = await askQuestion({
        ...dependencies.createAskQuestionDependencies(),
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
