import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT_DIR = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const BACKEND_DIR = join(ROOT_DIR, 'src/backend');
const NETLIFY_DIR = join(ROOT_DIR, 'netlify');
const PUBLIC_DIR = join(ROOT_DIR, 'public');

test('uses one RAG function and removes old contact function files', () => {
  assert.equal(existsSync(join(NETLIFY_DIR, 'functions/rag.js')), true);
  assert.equal(existsSync(join(NETLIFY_DIR, 'functions/security-challenge.js')), false);
  assert.equal(existsSync(join(NETLIFY_DIR, 'functions/security-verify.js')), false);
  assert.equal(existsSync(join(NETLIFY_DIR, 'functions/assistant-challenge.js')), false);
  assert.equal(existsSync(join(NETLIFY_DIR, 'functions/assistant-ask.js')), false);
  assert.equal(existsSync(join(NETLIFY_DIR, 'functions/assistant-ui-copy.js')), false);
  assert.equal(existsSync(join(NETLIFY_DIR, 'functions/contact-challenge.js')), false);
  assert.equal(existsSync(join(NETLIFY_DIR, 'functions/contact-verify.js')), false);
});

test('uses one admin function for admin feature endpoints', () => {
  assert.equal(existsSync(join(NETLIFY_DIR, 'functions/admin.js')), true);
  assert.equal(existsSync(join(NETLIFY_DIR, 'functions/admin-auth.js')), false);
  assert.equal(existsSync(join(NETLIFY_DIR, 'functions/admin-user.js')), false);
  assert.equal(existsSync(join(NETLIFY_DIR, 'functions/admin-outreach.js')), false);
  assert.equal(existsSync(join(NETLIFY_DIR, 'functions/admin-visits.js')), false);
  assert.equal(existsSync(join(NETLIFY_DIR, 'functions/admin-assistant-conversations.js')), false);
});

test('keeps route-specific adapters that need deployment-level config', () => {
  const adminFunction = readNetlifyFile('functions/admin.js');

  assert.equal(existsSync(join(NETLIFY_DIR, 'functions/assistant-conversation-log.js')), true);
  assert.equal(existsSync(join(NETLIFY_DIR, 'functions/visit-log.js')), true);
  assert.equal(existsSync(join(NETLIFY_DIR, 'functions/maintenance-retention.js')), true);
  assert.equal(existsSync(join(NETLIFY_DIR, 'functions/visit-events-retention.js')), false);
  assert.equal(
    existsSync(join(NETLIFY_DIR, 'functions/assistant-conversations-retention.js')),
    false
  );
  assert.doesNotMatch(
    adminFunction,
    /assistant-conversation-log|\/api\/visit-log|rateLimit|schedule/
  );
});

test('backend app APIs expose the security routes and old API folders are removed', () => {
  assert.match(
    readBackendFile('rag/apps/api/controllers/security.controller.ts'),
    /@route\('GET', '\/api\/security\/challenge'\)/
  );
  assert.match(
    readBackendFile('rag/apps/api/controllers/security.controller.ts'),
    /@route\('POST', '\/api\/security\/verify'\)/
  );
  assert.equal(existsSync(join(BACKEND_DIR, 'rag/api')), false);
  assert.equal(existsSync(join(BACKEND_DIR, 'admin/api')), false);
});

test('function files use backend API entrypoints', () => {
  assert.match(readNetlifyFile('functions/rag.js'), /apps\/api\/api\.ts/);
  assert.match(readNetlifyFile('functions/admin.js'), /apps\/api\/api\.ts/);
  assert.match(readNetlifyFile('functions/assistant-conversation-log.js'), /apps\/api\/api\.ts/);
  assert.match(
    readNetlifyFile('functions/maintenance-retention.js'),
    /maintenance\/apps\/api\/api\.ts/
  );
  assert.match(
    readNetlifyFile('functions/maintenance-keep-database-alive.js'),
    /maintenance\/apps\/api\/api\.ts/
  );
  assert.match(readNetlifyFile('functions/mcp.js'), /mcp\/apps\/api\/api\.ts/);
});

test('TypeScript-backed public MCP function bundles', async () => {
  await buildFunction('functions/mcp.js');
});

test('TypeScript-backed maintenance keep-alive function bundles', async () => {
  await buildFunction('functions/maintenance-keep-database-alive.js');
});

test('TypeScript-backed maintenance retention function bundles', async () => {
  await buildFunction('functions/maintenance-retention.js');
});

test('TypeScript-backed visit log function bundles', async () => {
  await buildFunction('functions/visit-log.js');
});

test('visit log adapter forwards Netlify context geolocation through headers', () => {
  const content = readNetlifyFile('functions/visit-log.js');

  assert.match(content, /context\.ip/);
  assert.match(content, /context\.geo/);
  assert.match(content, /x-country/);
  assert.match(content, /x-region/);
  assert.match(content, /x-city/);
  assert.match(content, /x-timezone/);
});

test('public redirects expose function endpoints before the 404 fallback', () => {
  const redirects = readPublicFile('_redirects');
  const fallbackIndex = redirects.indexOf('/* /404.html 404');
  const adminFunction = readNetlifyFile('functions/admin.js');

  assert.notEqual(fallbackIndex, -1);

  for (const redirect of [
    '/api/assistant/challenge /.netlify/functions/rag                 200',
    '/api/assistant/ask       /.netlify/functions/rag                 200',
    '/api/assistant/ui-copy   /.netlify/functions/rag                 200',
    '/api/security/challenge  /.netlify/functions/rag                 200',
    '/api/security/verify     /.netlify/functions/rag                 200',
    '/api/admin/login         /.netlify/functions/admin               200',
    '/api/admin/session       /.netlify/functions/admin               200',
    '/api/admin/user          /.netlify/functions/admin               200',
    '/api/admin/outreach-records /.netlify/functions/admin            200',
    '/api/admin/outreach-summary /.netlify/functions/admin            200',
    '/api/admin/outreach-chart /.netlify/functions/admin              200',
    '/api/admin/outreach-export /.netlify/functions/admin             200',
    '/api/admin/outreach-import /.netlify/functions/admin             200',
    '/api/admin/outreach-record /.netlify/functions/admin             200',
    '/api/admin/visit-metrics /.netlify/functions/admin               200',
    '/api/admin/visit-country-breakdown /.netlify/functions/admin     200',
    '/api/admin/visit-sessions /.netlify/functions/admin              200',
    '/api/admin/all-visit-sessions /.netlify/functions/admin          200',
    '/api/admin/visit-session /.netlify/functions/admin               200',
    '/api/admin/visit-journey /.netlify/functions/admin               200',
    '/api/admin/maintenance-retention /.netlify/functions/maintenance-retention 200',
    '/api/admin/assistant-conversation-log /.netlify/functions/assistant-conversation-log 200',
    '/api/admin/assistant-conversations    /.netlify/functions/admin  200',
    '/api/admin/assistant-conversation     /.netlify/functions/admin  200',
    '/mcp                     /.netlify/functions/mcp                 200',
  ]) {
    const redirectIndex = redirects.indexOf(redirect);

    assert.notEqual(redirectIndex, -1, `Missing redirect: ${redirect}`);
    assert.ok(redirectIndex < fallbackIndex, `Redirect must be before 404 fallback: ${redirect}`);

    const [path, target] = redirect.split(/\s+/);
    if (target === '/.netlify/functions/admin') {
      assert.match(adminFunction, new RegExp(`['"]${escapeRegExp(path)}['"]`));
    }
  }
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('removed netlify implementation folder stays removed', () => {
  assert.equal(existsSync(join(NETLIFY_DIR, 'implementations')), false);
});

test('netlify functions do not reference removed implementation folders or old contact routes', () => {
  const files = [
    'functions/admin.js',
    'functions/assistant-conversation-log.js',
    'functions/visit-log.js',
    'functions/maintenance-retention.js',
    'functions/rag.js',
    'functions/mcp.js',
    'functions/maintenance-keep-database-alive.js',
  ];

  for (const file of files) {
    const content = readNetlifyFile(file);
    assert.doesNotMatch(content, /\.\.\/implementations|netlify\/implementations/);
    assert.doesNotMatch(content, /\/api\/contact\//);
  }
});

test('function-bound JSON config is imported instead of read from deployment paths', () => {
  for (const file of [
    'rag/application/config/sourcecatalog.config.ts',
    'rag/application/config/languages.config.ts',
    'rag/application/assistantcopy/sourcecopy.ts',
    'rag/infrastructure/ingestion/sourcemanifest.config.ts',
  ]) {
    const content = readBackendFile(file);

    assert.doesNotMatch(content, /readFileSync|process\.cwd\(\)|new URL\([^)]*\.json/);
    assert.match(content, /from ['"].*\.json['"] with \{ type: ['"]json['"] \}/);
  }
});

test('function bundles inline JSON config used during module load', async () => {
  await assertFunctionBundleIncludesJsonConfig('functions/rag.js', [
    'homepageSectionScopes',
    'defaultLanguage',
  ]);
  await assertFunctionBundleIncludesJsonConfig('functions/rag.js', ['leadCaptureQuickPrompts']);
});

function readBackendFile(path) {
  return readFileSync(join(BACKEND_DIR, path), 'utf8');
}

function readNetlifyFile(path) {
  return readFileSync(join(NETLIFY_DIR, path), 'utf8');
}

function readPublicFile(path) {
  return readFileSync(join(PUBLIC_DIR, path), 'utf8');
}

async function assertFunctionBundleIncludesJsonConfig(path, expectedTerms) {
  const result = await buildFunction(path);
  const bundle = result.outputFiles[0].text;

  assert.doesNotMatch(
    bundle,
    /readFileSync\(new URL|readSourcesConfig|readLanguageConfig|ASSISTANT_COPY_PATH/
  );

  for (const term of expectedTerms) {
    assert.match(bundle, new RegExp(term), `${path} should bundle JSON config term: ${term}`);
  }
}

function buildFunction(path) {
  return build({
    entryPoints: [join(NETLIFY_DIR, path)],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    write: false,
    external: ['@netlify/functions'],
  });
}
