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
    readJsonBody(request, options = {}) {
      return readJsonBody(request, options);
    },
    readSearchParams(request, options = {}) {
      return readSearchParams(request, options);
    },
    sanitizeInput(value, options = {}) {
      return sanitizeInput(value, options);
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

export async function readJsonBody(request, options = {}) {
  try {
    return sanitizeInput(await request.json(), options);
  } catch {
    if (options.fallback !== undefined) return options.fallback;

    const error = new Error(options.message || 'Invalid JSON body');
    error.statusCode = options.statusCode || 400;
    error.code = options.code || 'invalid_json';
    throw error;
  }
}

export function readSearchParams(request, options = {}) {
  return sanitizeInput(Object.fromEntries(new URL(request.url).searchParams.entries()), options);
}

export function sanitizeInput(value, options = {}) {
  if (typeof value === 'string') return sanitizeString(value, options);
  if (Array.isArray(value)) return value.map(item => sanitizeInput(item, options));
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      sanitizeObjectKey(key),
      sanitizeInput(item, options),
    ])
  );
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

function sanitizeString(value, options) {
  const sanitized = value
    // eslint-disable-next-line no-control-regex -- Sanitizer intentionally strips control chars.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .normalize('NFC');

  return options.trimStrings === false ? sanitized : sanitized.trim();
}

function sanitizeObjectKey(value) {
  // eslint-disable-next-line no-control-regex -- Sanitizer intentionally strips control chars.
  return value.replace(/[\u0000-\u001F\u007F]/g, '').trim();
}
