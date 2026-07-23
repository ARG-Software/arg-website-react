import { RagValidationError, askQuestion } from '../../rag/runtime/ask.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
    const result = await askQuestion({
      question: payload.question,
      messages: payload.messages,
      sourceTypes: payload.sourceTypes,
      pageContext: payload.pageContext,
    });

    return createResponse(200, {
      answer: result.answer,
      citations: result.citations,
    });
  } catch (error) {
    const statusCode = isConfigurationError(error) ? 503 : isClientError(error) ? 400 : 500;
    const errorBody =
      statusCode === 400 || statusCode === 503
        ? createErrorBody(
            isConfigurationError(error) ? 'configuration_error' : error.code,
            isConfigurationError(error) ? 'Assistant configuration is unavailable' : error.message
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

function isConfigurationError(error) {
  return (
    error instanceof Error && error.message.startsWith('Missing required environment variables:')
  );
}
