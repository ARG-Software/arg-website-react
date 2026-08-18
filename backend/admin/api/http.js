const DEFAULT_ALLOWED_ORIGINS = ['https://arg.software', 'https://www.arg.software'];

export function createErrorBody(code, message) {
  return {
    error: {
      code,
      message,
    },
  };
}

export function createJsonResponse(request, allowedMethods, statusCode, body, env = {}) {
  const responseBody =
    statusCode === 204 ? null : typeof body === 'string' ? body : JSON.stringify(body);

  return new Response(responseBody, {
    status: statusCode,
    headers: {
      ...createCorsHeaders(request, allowedMethods, env),
      'Content-Type': 'application/json',
    },
  });
}

export function createOriginGuardResponse(request, allowedMethods, env = {}) {
  const origin = getRequestOrigin(request);

  if (!origin || isAllowedOrigin(origin, env)) {
    return null;
  }

  return createJsonResponse(
    request,
    allowedMethods,
    403,
    createErrorBody('origin_not_allowed', 'Origin not allowed'),
    env
  );
}

function createCorsHeaders(request, allowedMethods, env) {
  const origin = getRequestOrigin(request);
  const headers = {
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': allowedMethods,
    Vary: 'Origin',
  };

  if (origin && isAllowedOrigin(origin, env)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

function isAllowedOrigin(origin, env) {
  return getAllowedOrigins(env).has(normalizeOrigin(origin));
}

function getAllowedOrigins(env) {
  return new Set(
    [
      ...DEFAULT_ALLOWED_ORIGINS,
      ...readOriginList(env.ALLOWED_API_ORIGINS),
      env.URL,
      env.DEPLOY_URL,
      env.DEPLOY_PRIME_URL,
    ]
      .map(normalizeOrigin)
      .filter(Boolean)
  );
}

function getRequestOrigin(request) {
  return normalizeOrigin(request.headers.get('origin'));
}

function readOriginList(value) {
  return value ? value.split(',') : [];
}

function normalizeOrigin(value) {
  if (!value || typeof value !== 'string') {
    return '';
  }

  try {
    return new URL(value.trim()).origin;
  } catch {
    return '';
  }
}
