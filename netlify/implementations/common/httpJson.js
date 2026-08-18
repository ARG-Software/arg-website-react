import { createCorsHeaders } from './apiOrigin.js';

export function createErrorBody(code, message) {
  return {
    error: {
      code,
      message,
    },
  };
}

export function createJsonResponse(request, allowedMethods, statusCode, body) {
  const responseBody =
    statusCode === 204 ? null : typeof body === 'string' ? body : JSON.stringify(body);

  return new Response(responseBody, {
    status: statusCode,
    headers: {
      ...createCorsHeaders(request, allowedMethods),
      'Content-Type': 'application/json',
    },
  });
}
