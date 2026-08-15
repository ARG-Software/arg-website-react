const DEFAULT_ALLOWED_ORIGINS = ['https://arg.software', 'https://www.arg.software'];

export function createCorsHeaders(request, allowedMethods) {
  const origin = getRequestOrigin(request);
  const headers = {
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': allowedMethods,
    Vary: 'Origin',
  };

  if (origin && isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

export function createOriginGuardResponse(request, allowedMethods) {
  const origin = getRequestOrigin(request);

  if (!origin || isAllowedOrigin(origin)) {
    return null;
  }

  return new Response(
    JSON.stringify({ error: { code: 'origin_not_allowed', message: 'Origin not allowed' } }),
    {
      status: 403,
      headers: {
        ...createCorsHeaders(request, allowedMethods),
        'Content-Type': 'application/json',
      },
    }
  );
}

export function isAllowedOrigin(origin) {
  return getAllowedOrigins().has(normalizeOrigin(origin));
}

function getAllowedOrigins() {
  return new Set(
    [
      ...DEFAULT_ALLOWED_ORIGINS,
      ...readOriginList(process.env.ALLOWED_API_ORIGINS),
      process.env.URL,
      process.env.DEPLOY_URL,
      process.env.DEPLOY_PRIME_URL,
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
