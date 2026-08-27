interface ApiHttpOptions extends SanitizerOptions {
  allowedHeaders?: string;
  defaultAllowedOrigins?: readonly string[];
}

interface CreateApiHttpOptions extends ApiHttpOptions {
  allowedMethods: string;
}

interface SanitizerOptions {
  trimStrings?: boolean;
}

interface JsonBodyOptions extends SanitizerOptions {
  fallback?: any;
  message?: string;
  statusCode?: number;
  code?: string;
}

const DEFAULT_ALLOWED_HEADERS = 'Authorization, Content-Type';

export function createApiHttp({ allowedMethods, ...options }: CreateApiHttpOptions) {
  return {
    createErrorBody,
    createJsonResponse(request: Request, statusCode: number, body: unknown) {
      return createJsonResponse(request, allowedMethods, statusCode, body, options);
    },
    createOriginGuardResponse(request: Request) {
      return createOriginGuardResponse(request, allowedMethods, options);
    },
    createCorsHeaders(request: Request) {
      return createCorsHeaders(request, allowedMethods, options);
    },
    readJsonBody(request: Request, options: JsonBodyOptions = {}) {
      return readJsonBody(request, options);
    },
    readSearchParams(request: Request, options: SanitizerOptions = {}) {
      return readSearchParams(request, options);
    },
    getClientIp,
    sanitizeInput(value: any, options: SanitizerOptions = {}) {
      return sanitizeInput(value, options);
    },
    isAllowedOrigin(origin: string) {
      return isAllowedOrigin(origin, options);
    },
  };
}

export function createErrorBody(code: string, message: string) {
  return {
    error: {
      code,
      message,
    },
  };
}

export async function readJsonBody(request: Request, options: JsonBodyOptions = {}): Promise<any> {
  try {
    return sanitizeInput(await request.json(), options);
  } catch {
    if (options.fallback !== undefined) return options.fallback;

    const error = new Error(options.message || 'Invalid JSON body') as Error & {
      code: string;
      statusCode: number;
    };
    error.statusCode = options.statusCode || 400;
    error.code = options.code || 'invalid_json';
    throw error;
  }
}

export function readSearchParams(request: Request, options: SanitizerOptions = {}): Record<string, any> {
  return sanitizeInput(Object.fromEntries(new URL(request.url).searchParams.entries()), options);
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-nf-client-connection-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

export function sanitizeInput(value: any, options: SanitizerOptions = {}): any {
  if (typeof value === 'string') return sanitizeString(value, options);
  if (Array.isArray(value)) return value.map(item => sanitizeInput(item, options));
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [sanitizeObjectKey(key), sanitizeInput(item, options)])
  );
}

export function createJsonResponse(
  request: Request,
  allowedMethods: string,
  statusCode: number,
  body: unknown,
  options: ApiHttpOptions = {}
): Response {
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

export function createOriginGuardResponse(
  request: Request,
  allowedMethods: string,
  options: ApiHttpOptions = {}
): Response | null {
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

export function createCorsHeaders(
  request: Request,
  allowedMethods: string,
  options: ApiHttpOptions = {}
): Record<string, string> {
  const origin = getRequestOrigin(request);
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': options.allowedHeaders || DEFAULT_ALLOWED_HEADERS,
    'Access-Control-Allow-Methods': allowedMethods,
    Vary: 'Origin',
  };

  if (origin && isAllowedOrigin(origin, options)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

export function isAllowedOrigin(origin: string, options: ApiHttpOptions = {}): boolean {
  return getAllowedOrigins(options).has(normalizeOrigin(origin));
}

function getAllowedOrigins(options: ApiHttpOptions): Set<string> {
  return new Set(
    [
      ...(options.defaultAllowedOrigins || []),
      ...readOriginList(process.env.ALLOWED_API_ORIGINS),
      process.env.URL,
      process.env.DEPLOY_URL,
      process.env.DEPLOY_PRIME_URL,
    ]
      .map(normalizeOrigin)
      .filter(Boolean)
  );
}

function getRequestOrigin(request: Request): string {
  return normalizeOrigin(request.headers.get('origin'));
}

function readOriginList(value: string | undefined): string[] {
  return value ? value.split(',') : [];
}

function normalizeOrigin(value: unknown): string {
  if (!value || typeof value !== 'string') {
    return '';
  }

  try {
    return new URL(value.trim()).origin;
  } catch {
    return '';
  }
}

function sanitizeString(value: string, options: SanitizerOptions): string {
  const sanitized = value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .normalize('NFC');

  return options.trimStrings === false ? sanitized : sanitized.trim();
}

function sanitizeObjectKey(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, '').trim();
}
