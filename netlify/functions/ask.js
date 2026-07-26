import { RagValidationError, askQuestion } from '../../rag/runtime/askQuestion.ts';
import { GeminiEmbeddingQuotaError } from '../../rag/clients/gemini.ts';
import { verifyAltchaChallenge } from '../../rag/security/altcha.ts';
import { checkRateLimits, getRateLimitConfig } from '../../rag/security/rateLimit.ts';
import { SupabaseRateLimitStore } from '../../rag/security/rateLimitStores.ts';
import { createSupabaseServiceClient } from '../../rag/clients/supabaseClient.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const config = {
  path: '/.netlify/functions/ask',
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

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(204, '');
  }

  if (event.httpMethod !== 'POST') {
    return createResponse(405, createErrorBody('method_not_allowed', 'Method not allowed'));
  }

  let payload;

  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return createResponse(400, createErrorBody('invalid_json', 'Invalid JSON body'));
  }

  try {
    if (!payload.altcha?.challenge || !payload.altcha?.solution) {
      return createResponse(403, createErrorBody('bot_verification_failed', 'Verification required'));
    }

    const altchaResult = await verifyAltchaChallenge({
      challenge: payload.altcha.challenge,
      solution: payload.altcha.solution,
    });

    if (!altchaResult.verified) {
      return createResponse(403, createErrorBody('bot_verification_failed', 'Verification failed'));
    }
  } catch {
    return createResponse(403, createErrorBody('bot_verification_failed', 'Verification failed'));
  }

  const clientIp = event.headers['x-nf-client-connection-ip'] || 'unknown';

  try {
    const rateLimitConfig = getRateLimitConfig();
    const rateLimitResult = await checkRateLimits(clientIp, getRateLimitStore(), rateLimitConfig);

    if (!rateLimitResult.allowed) {
      return createResponse(
        429,
        createErrorBody('rate_limited', 'Too many requests. Please try again later.')
      );
    }
  } catch (error) {
    console.error('Rate limit check failed, failing open:', error);
  }

  try {
    const result = await askQuestion({
      question: payload.question,
      messages: payload.messages,
      pageContext: payload.pageContext,
    });

    return createResponse(200, {
      answer: result.answer,
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

    return createResponse(statusCode, errorBody);
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

function isClientError(error) {
  return error instanceof RagValidationError;
}

function isServiceUnavailable(error) {
  return isConfigurationError(error) || error instanceof GeminiEmbeddingQuotaError;
}

function isConfigurationError(error) {
  return (
    error instanceof Error && error.message.startsWith('Missing required environment variables:')
  );
}

function getServiceErrorCode(error) {
  if (error instanceof GeminiEmbeddingQuotaError) {
    return error.code;
  }

  return 'configuration_error';
}
