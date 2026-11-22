// Google Search Console performance report for arg.software.
// Key: service account JSON at GOOGLE_APPLICATION_CREDENTIALS (.env).
// Usage: npm run seo:gsc -- [--dimension query|page|country|device|date] [--days 28] [--limit 25] [--page /blog/] [--json]
import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';
import { parseArgs } from 'node:util';
import { config as loadDotenv } from 'dotenv';

loadDotenv({ path: '.env', quiet: true });

const SITE_URL = 'sc-domain:arg.software';
// Search Console data lags about two days behind.
const DATA_LAG_DAYS = 2;

const { values: args } = parseArgs({
  options: {
    dimension: { type: 'string', default: 'query' },
    days: { type: 'string', default: '28' },
    limit: { type: 'string', default: '25' },
    page: { type: 'string' },
    json: { type: 'boolean', default: false },
  },
});

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) {
  throw new Error('Missing required environment variable: GOOGLE_APPLICATION_CREDENTIALS');
}
const key = JSON.parse(readFileSync(keyPath, 'utf8'));

const accessToken = await getAccessToken(key);

const end = new Date(Date.now() - DATA_LAG_DAYS * 86400000);
const start = new Date(end.getTime() - (Number(args.days) - 1) * 86400000);
const body = {
  startDate: start.toISOString().slice(0, 10),
  endDate: end.toISOString().slice(0, 10),
  dimensions: [args.dimension],
  rowLimit: Number(args.limit),
};
if (args.page) {
  body.dimensionFilterGroups = [{ filters: [{ dimension: 'page', operator: 'contains', expression: args.page }] }];
}

const response = await fetch(
  `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`,
  {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  },
);
const data = await response.json();
if (!response.ok) {
  throw new Error(`Search Console API ${response.status}: ${JSON.stringify(data.error ?? data)}`);
}

const rows = (data.rows ?? []).map((row) => ({
  [args.dimension]: row.keys[0],
  clicks: row.clicks,
  impressions: row.impressions,
  ctr: `${(row.ctr * 100).toFixed(1)}%`,
  position: Number(row.position.toFixed(1)),
}));

if (args.json) {
  console.log(JSON.stringify({ site: SITE_URL, ...body, rows }, null, 2));
} else {
  console.log(`${SITE_URL} · ${body.startDate} → ${body.endDate} · by ${args.dimension}${args.page ? ` · page contains "${args.page}"` : ''}`);
  console.table(rows);
}

// Service account OAuth: sign a JWT with the key and exchange it for an access token.
async function getAccessToken(serviceAccount) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: serviceAccount.token_uri,
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(serviceAccount.private_key, 'base64url');

  const tokenResponse = await fetch(serviceAccount.token_uri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
  });
  const token = await tokenResponse.json();
  if (!token.access_token) {
    throw new Error(`Google token request failed: ${JSON.stringify(token)}`);
  }
  return token.access_token;
}
