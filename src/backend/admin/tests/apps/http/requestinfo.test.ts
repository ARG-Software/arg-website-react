import assert from 'node:assert/strict';
import test from 'node:test';

import { getHeaderGeolocation } from '../../../apps/http/requestinfo.js';

test('reads Netlify geolocation headers from visit requests', () => {
  const request = new Request('https://arg.software/api/visit-log', {
    headers: {
      'x-country': 'pt',
      'x-region': 'Madeira',
      'x-city': 'Canico',
      'x-timezone': 'Atlantic/Madeira',
    },
  });

  assert.deepEqual(getHeaderGeolocation(request), {
    countryCode: 'PT',
    region: 'Madeira',
    city: 'Canico',
    timezone: 'Atlantic/Madeira',
  });
});

test('falls back to provider country header and ignores invalid country codes', () => {
  const providerRequest = new Request('https://arg.software/api/visit-log', {
    headers: { 'cf-ipcountry': 'de' },
  });
  const invalidRequest = new Request('https://arg.software/api/visit-log', {
    headers: { 'x-country': 'unknown' },
  });

  assert.equal(getHeaderGeolocation(providerRequest).countryCode, 'DE');
  assert.equal(getHeaderGeolocation(invalidRequest).countryCode, null);
});
