export const ACCESS_COOKIE_NAME = 'arg_admin_access';
export const REFRESH_COOKIE_NAME = 'arg_admin_refresh';

const ONE_HOUR = 60 * 60;
const SEVEN_DAYS = ONE_HOUR * 24 * 7;

interface ICookieOptions {
  maxAge?: number;
  secure?: boolean;
}

export function setSessionCookies(
  response: Response,
  { accessToken, refreshToken }: { accessToken: string; refreshToken: string },
  secureCookies: boolean
) {
  response.headers.append(
    'Set-Cookie',
    createCookie(ACCESS_COOKIE_NAME, accessToken, {
      maxAge: ONE_HOUR,
      secure: secureCookies,
    })
  );

  response.headers.append(
    'Set-Cookie',
    createCookie(REFRESH_COOKIE_NAME, refreshToken, {
      maxAge: SEVEN_DAYS,
      secure: secureCookies,
    })
  );
}

export function clearSessionCookies(response: Response) {
  response.headers.append('Set-Cookie', createCookie(ACCESS_COOKIE_NAME, '', { maxAge: 0 }));
  response.headers.append('Set-Cookie', createCookie(REFRESH_COOKIE_NAME, '', { maxAge: 0 }));
}

export function getAccessToken(request: Request) {
  return getTokenFromCookie(request, ACCESS_COOKIE_NAME);
}

export function getRefreshToken(request: Request) {
  return getTokenFromCookie(request, REFRESH_COOKIE_NAME);
}

function getTokenFromCookie(request: Request, cookieName: string) {
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

function createCookie(name: string, value: string, options: ICookieOptions = {}) {
  const parts = [`${name}=${value}`];

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  parts.push('Path=/api/admin');
  parts.push('HttpOnly');
  parts.push('SameSite=Lax');

  if (options.secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}
