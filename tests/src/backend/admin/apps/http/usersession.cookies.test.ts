import assert from 'node:assert/strict';
import test from 'node:test';

import {
  setUserSessionCookies,
  clearUserSessionCookies,
  getAccessToken,
  getRefreshToken,
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
} from '../../../../../../src/backend/admin/apps/http/usersession.cookies.js';

test('setUserSessionCookies adds Set-Cookie headers for access and refresh tokens', () => {
  const response = new Response(null);
  const tokens = { accessToken: 'access-123', refreshToken: 'refresh-456' };

  setUserSessionCookies(response, tokens, true);

  const cookies = response.headers.getSetCookie();
  assert.equal(cookies.length, 3);

  const accessCookie = cookies.find(
    cookie => cookie.startsWith(`${ACCESS_COOKIE_NAME}=access-123`) && !cookie.includes('Max-Age=0')
  );
  const refreshCookie = cookies.find(cookie =>
    cookie.startsWith(`${REFRESH_COOKIE_NAME}=refresh-456`)
  );
  const legacyRefreshCookie = cookies.find(
    cookie =>
      cookie.startsWith(`${REFRESH_COOKIE_NAME}=`) &&
      cookie.includes('Max-Age=0') &&
      cookie.includes('Path=/api/admin;')
  );

  assert.ok(accessCookie);
  assert.ok(refreshCookie);
  assert.ok(legacyRefreshCookie);
  assertCookieSecurity(accessCookie, '/api/admin');
  assertCookieSecurity(refreshCookie, '/api/admin/session');
  assertCookieSecurity(legacyRefreshCookie, '/api/admin');
  assert.ok(refreshCookie.includes('Max-Age=604800'));
});

test('clearUserSessionCookies expires both cookies', () => {
  const response = new Response(null);

  clearUserSessionCookies(response, true);

  const cookies = response.headers.getSetCookie();
  assert.equal(cookies.length, 3);

  const accessCookie = cookies.find(c => c.startsWith(`${ACCESS_COOKIE_NAME}=`));
  const refreshCookies = cookies.filter(c => c.startsWith(`${REFRESH_COOKIE_NAME}=`));
  assert.ok(accessCookie.includes('Max-Age=0'));
  assertCookieSecurity(accessCookie, '/api/admin');
  assert.equal(refreshCookies.length, 2);
  assert.ok(refreshCookies.every(cookie => cookie.includes('Max-Age=0')));
  assert.ok(refreshCookies.some(cookie => cookie.includes('Path=/api/admin/session')));
  assert.ok(refreshCookies.some(cookie => cookie.includes('Path=/api/admin;')));
  refreshCookies.forEach(cookie => assertCookieSecurity(cookie));
});

test('getAccessToken reads token from Cookie header', () => {
  const request = new Request('https://arg.software', {
    headers: { Cookie: `${ACCESS_COOKIE_NAME}=my-token; other=value` },
  });

  assert.equal(getAccessToken(request), 'my-token');
});

test('getRefreshToken reads token from Cookie header', () => {
  const request = new Request('https://arg.software', {
    headers: { Cookie: `other=value; ${REFRESH_COOKIE_NAME}=refresh-token` },
  });

  assert.equal(getRefreshToken(request), 'refresh-token');
});

test('getAccessToken returns empty string if cookie missing', () => {
  const request = new Request('https://arg.software');
  assert.equal(getAccessToken(request), '');
});

function assertCookieSecurity(cookie: string, path?: string) {
  assert.ok(cookie.includes('HttpOnly'));
  assert.ok(cookie.includes('Secure'));
  assert.ok(cookie.includes('SameSite=Strict'));
  assert.doesNotMatch(cookie, /Domain=/i);
  if (path) assert.ok(cookie.includes(`Path=${path}`));
}
