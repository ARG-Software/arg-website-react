export const ACCESS_COOKIE_NAME = 'arg_admin_access';
export const REFRESH_COOKIE_NAME = 'arg_admin_refresh';

const ONE_HOUR = 60 * 60;
const SEVEN_DAYS = ONE_HOUR * 24 * 7;
const ACCESS_COOKIE_PATH = '/api/admin';
const REFRESH_COOKIE_PATH = '/api/admin/session';

type CookieOptions = {
  maxAge?: number;
  secure?: boolean;
  path: string;
};

export function setUserSessionCookies(
  response: Response,
  { accessToken, refreshToken }: { accessToken: string; refreshToken: string },
  secureCookies: boolean
): void {
  response.headers.append(
    'Set-Cookie',
    createCookie(ACCESS_COOKIE_NAME, accessToken, {
      maxAge: ONE_HOUR,
      secure: secureCookies,
      path: ACCESS_COOKIE_PATH,
    })
  );

  response.headers.append(
    'Set-Cookie',
    createCookie(REFRESH_COOKIE_NAME, refreshToken, {
      maxAge: SEVEN_DAYS,
      secure: secureCookies,
      path: REFRESH_COOKIE_PATH,
    })
  );

  response.headers.append(
    'Set-Cookie',
    createCookie(REFRESH_COOKIE_NAME, '', {
      maxAge: 0,
      secure: secureCookies,
      path: ACCESS_COOKIE_PATH,
    })
  );
}

export function clearUserSessionCookies(response: Response, secureCookies: boolean): void {
  response.headers.append(
    'Set-Cookie',
    createCookie(ACCESS_COOKIE_NAME, '', {
      maxAge: 0,
      secure: secureCookies,
      path: ACCESS_COOKIE_PATH,
    })
  );
  response.headers.append(
    'Set-Cookie',
    createCookie(REFRESH_COOKIE_NAME, '', {
      maxAge: 0,
      secure: secureCookies,
      path: REFRESH_COOKIE_PATH,
    })
  );
  response.headers.append(
    'Set-Cookie',
    createCookie(REFRESH_COOKIE_NAME, '', {
      maxAge: 0,
      secure: secureCookies,
      path: ACCESS_COOKIE_PATH,
    })
  );
}

export function getAccessToken(request: Request): string {
  return getTokenFromCookie(request, ACCESS_COOKIE_NAME);
}

export function getRefreshToken(request: Request): string {
  return getTokenFromCookie(request, REFRESH_COOKIE_NAME);
}

export function copyResponseHeaders(source: Response, target: Response): void {
  source.headers.forEach((value, name) => {
    target.headers.append(name, value);
  });
}

function getTokenFromCookie(request: Request, cookieName: string): string {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = cookieHeader.split(';').map(cookie => cookie.trim());
  const targetPrefix = `${cookieName}=`;

  for (const cookie of cookies) {
    if (cookie.startsWith(targetPrefix)) {
      return cookie.slice(targetPrefix.length);
    }
  }

  return '';
}

function createCookie(name: string, value: string, options: CookieOptions): string {
  const parts = [`${name}=${value}`];

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  parts.push(`Path=${options.path}`);
  parts.push('HttpOnly');
  parts.push('SameSite=Strict');

  if (options.secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}
