import assert from 'node:assert/strict';
import test from 'node:test';

import {
  setSessionCookies,
  clearSessionCookies,
  getAccessToken,
  getRefreshToken,
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
} from '../../infrastructure/http/adminCookies.js';

test('setSessionCookies adds Set-Cookie headers for access and refresh tokens', () => {
  const response = new Response(null);
  const tokens = { accessToken: 'access-123', refreshToken: 'refresh-456' };

  setSessionCookies(response, tokens, true);

  const cookies = response.headers.getSetCookie();
  assert.equal(cookies.length, 2);

  const accessCookie = cookies.find(c => c.startsWith(`${ACCESS_COOKIE_NAME}=`));
  const refreshCookie = cookies.find(c => c.startsWith(`${REFRESH_COOKIE_NAME}=`));

  assert.ok(accessCookie);
  assert.ok(refreshCookie);
  assert.ok(accessCookie.includes('HttpOnly'));
  assert.ok(accessCookie.includes('Secure'));
  assert.ok(refreshCookie.includes('Max-Age=604800'));
});

test('clearSessionCookies expires both cookies', () => {
  const response = new Response(null);

  clearSessionCookies(response);

  const cookies = response.headers.getSetCookie();
  assert.equal(cookies.length, 2);

  const accessCookie = cookies.find(c => c.startsWith(`${ACCESS_COOKIE_NAME}=`));
  assert.ok(accessCookie.includes('Max-Age=0'));
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
