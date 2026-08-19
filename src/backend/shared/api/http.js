const DEFAULT_ALLOWED_ORIGINS = ['https://arg.software', 'https://www.arg.software'];
const DEFAULT_ALLOWED_HEADERS = 'Authorization, Content-Type';

export function createApiHttp({ allowedMethods, env = process.env, ...options }) {
  const httpOptions = { ...options, env };

  return {
    createErrorBody,
    createJsonResponse(request, statusCode, body) {
      return createJsonResponse(request, allowedMethods, statusCode, body, httpOptions);
    },
    createOriginGuardResponse(request) {
      return createOriginGuardResponse(request, allowedMethods, httpOptions);
    },
    createCorsHeaders(request) {
      return createCorsHeaders(request, allowedMethods, httpOptions);
    },
    isAllowedOrigin(origin) {
      return isAllowedOrigin(origin, httpOptions);
    },
  };
}

export function createErrorBody(code, message) {
  return {
    error: {
      code,
      message,
    },
  };
}

export function createJsonResponse(request, allowedMethods, statusCode, body, options = {}) {
  const responseBody =
    statusCode === 204 ? null : typeof body === 'string' ? body : JSON.stringify(body);

  return new Response(responseBody, {
    status: statusCode,
    headers: {
      ...createCorsHeaders(request, allowedMethods, options),
      'Content-Type': 'application/json',
    },
  });
}

export function createOriginGuardResponse(request, allowedMethods, options = {}) {
  const origin = getRequestOrigin(request);

  if (!origin || isAllowedOrigin(origin, options)) {
    return null;
  }

  return createJsonResponse(
    request,
    allowedMethods,
    403,
    createErrorBody('origin_not_allowed', 'Origin not allowed'),
    options
  );
}

export function createCorsHeaders(request, allowedMethods, options = {}) {
  const origin = getRequestOrigin(request);
  const headers = {
    'Access-Control-Allow-Headers': options.allowedHeaders || DEFAULT_ALLOWED_HEADERS,
    'Access-Control-Allow-Methods': allowedMethods,
    Vary: 'Origin',
  };

  if (origin && isAllowedOrigin(origin, options)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

export function isAllowedOrigin(origin, options = {}) {
  return getAllowedOrigins(options).has(normalizeOrigin(origin));
}

function getAllowedOrigins(options) {
  const env = options.env || process.env;

  return new Set(
    [
      ...(options.defaultAllowedOrigins || DEFAULT_ALLOWED_ORIGINS),
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
