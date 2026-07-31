import { RagValidationError } from '../../rag/runtime/ask/askQuestion.ts';
import { EmbeddingQuotaExceededError } from '../../rag/domain/providers/ProviderErrors.ts';
import { createRagRuntime } from '../../rag/infrastructure/createRagRuntime.ts';
import { verifyAltchaChallenge } from '../../rag/security/altcha.ts';
import { checkRateLimits, getRateLimitConfig } from '../../rag/security/rateLimit.ts';
import { SupabaseRateLimitStore } from '../../rag/security/rateLimitStores.ts';
import { createSupabaseServiceClient } from '../../rag/clients/supabaseClient.ts';
import { createCorsHeaders, createOriginGuardResponse } from '../shared/apiOrigin.js';

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

let rateLimitStore;

function getRateLimitStore() {
  if (!rateLimitStore) {
    rateLimitStore = new SupabaseRateLimitStore(createSupabaseServiceClient());
  }
  return rateLimitStore;
}

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

  let payload;

  try {
    payload = await request.json();
  } catch {
    return createResponse(request, 400, createErrorBody('invalid_json', 'Invalid JSON body'));
  }

  try {
    if (!payload.altcha?.challenge || !payload.altcha?.solution) {
      return createResponse(
        request,
        403,
        createErrorBody('bot_verification_failed', 'Verification required')
      );
    }

    const altchaResult = await verifyAltchaChallenge({
      challenge: payload.altcha.challenge,
      solution: payload.altcha.solution,
    });

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

  const clientIp = request.headers.get('x-nf-client-connection-ip') || 'unknown';

  try {
    const rateLimitConfig = getRateLimitConfig();
    const rateLimitResult = await checkRateLimits(clientIp, getRateLimitStore(), rateLimitConfig);

    if (!rateLimitResult.allowed) {
      return createResponse(
        request,
        429,
        createErrorBody('rate_limited', 'Too many requests. Please try again later.')
      );
    }
  } catch (error) {
    console.error('Rate limit check failed, failing open:', error);
  }

  try {
    const result = await createRagRuntime().askQuestion({
      question: payload.question,
      messages: payload.messages,
      pageContext: payload.pageContext,
      preferredLanguage: payload.preferredLanguage,
    });

    return createResponse(request, 200, {
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

    return createResponse(request, statusCode, errorBody);
  }
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
