import { askQuestion } from '../../rag/runtime/ask.js';

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
    return createResponse(405, { error: 'Method not allowed' });
  }

  let payload;

  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return createResponse(400, { error: 'Invalid JSON body' });
  }

  try {
    const result = await askQuestion({
      question: payload.question,
      sourceTypes: payload.sourceTypes,
    });

    return createResponse(200, {
      answer: result.answer,
      citations: result.citations,
    });
  } catch (error) {
    const statusCode = isClientError(error) ? 400 : 500;
    const message = statusCode === 400 ? error.message : 'Unable to answer the question';

    if (statusCode === 500) {
      console.error(error);
    }

    return createResponse(statusCode, { error: message });
  }
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
  return (
    error.message === 'Question is required' ||
    error.message === 'Question must be 1000 characters or fewer' ||
    error.message === 'sourceTypes must be an array'
  );
}
