import { getAssistantUiCopy } from '../../rag/runtime/assistantUiCopy.ts';
import { createCorsHeaders, createOriginGuardResponse } from '../shared/apiOrigin.js';

const ALLOWED_METHODS = 'GET, OPTIONS';

export const config = {
  path: '/api/assistant/ui-copy',
  method: ['GET', 'OPTIONS'],
  rateLimit: {
    windowLimit: 20,
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

  if (request.method !== 'GET') {
    return createResponse(request, 405, {
      error: { code: 'method_not_allowed', message: 'Method not allowed' },
    });
  }

  try {
    const url = new URL(request.url);
    const language = url.searchParams.get('language') || 'en';
    return createResponse(request, 200, await getAssistantUiCopy(language));
  } catch (error) {
    console.error(error);
    return createResponse(request, 503, {
      error: {
        code: 'translation_unavailable',
        message: 'Assistant UI translation is temporarily unavailable',
      },
    });
  }
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
