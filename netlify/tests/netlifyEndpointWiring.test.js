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

test('uses security function names and removes old contact function files', () => {
  assert.equal(existsSync(join(NETLIFY_DIR, 'functions/security-challenge.js')), true);
  assert.equal(existsSync(join(NETLIFY_DIR, 'functions/security-verify.js')), true);
  assert.equal(existsSync(join(NETLIFY_DIR, 'functions/contact-challenge.js')), false);
  assert.equal(existsSync(join(NETLIFY_DIR, 'functions/contact-verify.js')), false);
});

test('backend app APIs expose the security routes and old API folders are removed', () => {
  assert.match(
    readBackendFile('rag/apps/gaspar/securityChallengeApi.js'),
    /path:\s*'\/api\/security\/challenge'/
  );
  assert.match(
    readBackendFile('rag/apps/gaspar/securityVerifyApi.js'),
    /path:\s*'\/api\/security\/verify'/
  );
  assert.equal(existsSync(join(BACKEND_DIR, 'rag/api')), false);
  assert.equal(existsSync(join(BACKEND_DIR, 'admin/api')), false);
});

test('function files instantiate backend API modules', () => {
  assert.match(readNetlifyFile('functions/security-challenge.js'), /createSecurityChallengeApi/);
  assert.match(readNetlifyFile('functions/security-verify.js'), /createSecurityVerifyApi/);
  assert.match(readNetlifyFile('functions/admin-login.js'), /createAdminLoginApi/);
  assert.match(readNetlifyFile('functions/admin-outreach.js'), /createAdminOutreachApi/);
  assert.match(
    readNetlifyFile('functions/assistant-conversation-log.js'),
    /createAssistantConversationLogApi/
  );
  assert.match(
    readNetlifyFile('functions/admin-assistant-conversations.js'),
    /createAdminAssistantConversationsApi/
  );
  assert.match(
    readNetlifyFile('functions/assistant-conversations-retention.js'),
    /createAssistantConversationsRetentionApi/
  );
  assert.match(
    readNetlifyFile('functions/maintenance-keep-database-alive.js'),
    /createKeepDatabaseAliveApi/
  );
  assert.match(readNetlifyFile('functions/assistant-ask.js'), /createAssistantAskApi/);
});

test('public redirects expose function endpoints before the 404 fallback', () => {
  const redirects = readPublicFile('_redirects');
  const fallbackIndex = redirects.indexOf('/* /404.html 404');

  assert.notEqual(fallbackIndex, -1);

  for (const redirect of [
    '/api/assistant/challenge /.netlify/functions/assistant-challenge 200',
    '/api/assistant/ask       /.netlify/functions/assistant-ask       200',
    '/api/assistant/ui-copy   /.netlify/functions/assistant-ui-copy   200',
    '/api/security/challenge  /.netlify/functions/security-challenge  200',
    '/api/security/verify     /.netlify/functions/security-verify     200',
    '/api/admin/login         /.netlify/functions/admin-login         200',
    '/api/admin/outreach      /.netlify/functions/admin-outreach      200',
    '/api/admin/assistant-conversation-log /.netlify/functions/assistant-conversation-log 200',
    '/api/admin/assistant-conversations    /.netlify/functions/admin-assistant-conversations 200',
    '/mcp                     /.netlify/functions/mcp                 200',
  ]) {
    const redirectIndex = redirects.indexOf(redirect);

    assert.notEqual(redirectIndex, -1, `Missing redirect: ${redirect}`);
    assert.ok(redirectIndex < fallbackIndex, `Redirect must be before 404 fallback: ${redirect}`);
  }
});

test('removed netlify implementation folder stays removed', () => {
  assert.equal(existsSync(join(NETLIFY_DIR, 'implementations')), false);
});

test('netlify functions do not reference removed implementation folders or old contact routes', () => {
  const files = [
    'functions/admin-outreach.js',
    'functions/admin-assistant-conversations.js',
    'functions/admin-login.js',
    'functions/assistant-conversation-log.js',
    'functions/assistant-conversations-retention.js',
    'functions/assistant-ask.js',
    'functions/assistant-challenge.js',
    'functions/assistant-ui-copy.js',
    'functions/mcp.js',
    'functions/maintenance-keep-database-alive.js',
    'functions/security-challenge.js',
    'functions/security-verify.js',
  ];

  for (const file of files) {
    const content = readNetlifyFile(file);
    assert.doesNotMatch(content, /\.\.\/implementations|netlify\/implementations/);
    assert.doesNotMatch(content, /\/api\/contact\//);
  }
});

test('function-bound JSON config is imported instead of read from deployment paths', () => {
  for (const file of [
    'rag/application/sourceConfig.ts',
    'rag/application/languageConfig.ts',
    'rag/application/assistantUiCopy/sourceCopy.ts',
    'rag/infrastructure/ingestion/sourceManifestConfig.ts',
  ]) {
    const content = readBackendFile(file);

    assert.doesNotMatch(content, /readFileSync|process\.cwd\(\)|new URL\([^)]*\.json/);
    assert.match(content, /from ['"].*\.json['"] with \{ type: ['"]json['"] \}/);
  }
});

test('function bundles inline JSON config used during module load', async () => {
  await assertFunctionBundleIncludesJsonConfig('functions/assistant-ask.js', [
    'homepageSectionScopes',
    'defaultLanguage',
  ]);
  await assertFunctionBundleIncludesJsonConfig('functions/assistant-ui-copy.js', [
    'leadCaptureQuickPrompts',
  ]);
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
  const result = await build({
    entryPoints: [join(NETLIFY_DIR, path)],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    write: false,
    external: ['@netlify/functions'],
  });
  const bundle = result.outputFiles[0].text;

  assert.doesNotMatch(
    bundle,
    /readFileSync\(new URL|readSourcesConfig|readLanguageConfig|ASSISTANT_COPY_PATH/
  );

  for (const term of expectedTerms) {
    assert.match(bundle, new RegExp(term), `${path} should bundle JSON config term: ${term}`);
  }
}
