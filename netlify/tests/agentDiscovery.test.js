import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const PUBLIC_DIR = join(ROOT_DIR, 'public');
const MANIFEST_PATH = join(PUBLIC_DIR, '.well-known', 'ard.json');
const ARD_URL = 'https://arg.software/.well-known/ard.json';

test('ARD manifest publishes the supported public agent resources', () => {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const identifiers = manifest.entries.map(entry => entry.identifier);

  assert.equal(manifest.specVersion, '1.0');
  assert.equal(manifest.entries.length, 3);
  assert.equal(new Set(identifiers).size, identifiers.length);
  assert.deepEqual(
    manifest.entries.map(entry => entry.type).sort(),
    [
      'application/mcp-server-card+json',
      'application/openapi+json',
      'text/markdown; profile="urn:air:agent-skills"',
    ]
  );

  for (const entry of manifest.entries) {
    assert.match(entry.identifier, /^urn:air:arg\.software:[a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+$/u);
    assert.ok(entry.displayName);
    assert.ok(entry.description);
    assert.equal(Object.hasOwn(entry, 'url') !== Object.hasOwn(entry, 'data'), true);
    assert.ok(entry.representativeQueries.length >= 2);
    assert.ok(entry.representativeQueries.length <= 5);
    assert.ok(entry.capabilities.length > 0);

    const artifactUrl = new URL(entry.url);
    assert.equal(artifactUrl.origin, 'https://arg.software');
    assert.equal(existsSync(join(PUBLIC_DIR, artifactUrl.pathname.slice(1))), true);
  }

  assert.equal(manifest.entries.some(entry => entry.type === 'application/a2a-agent-card+json'), false);
});

test('ARD manifest is advertised through web discovery signals', () => {
  const indexHtml = readFileSync(join(ROOT_DIR, 'index.html'), 'utf8');
  const headers = readFileSync(join(PUBLIC_DIR, '_headers'), 'utf8');
  const robots = readFileSync(join(PUBLIC_DIR, 'robots.txt'), 'utf8');

  assert.match(indexHtml, /<link rel="ard" href="https:\/\/arg\.software\/\.well-known\/ard\.json"/u);
  assert.match(headers, /Link: <\/\.well-known\/ard\.json>; rel="ard"; type="application\/json"/u);
  assert.match(headers, /\/\.well-known\/ard\.json[\s\S]*Content-Type: application\/json/u);
  assert.match(headers, /\/\.well-known\/ard\.json[\s\S]*Access-Control-Allow-Origin: \*/u);
  assert.match(robots, /Allow: \/\.well-known\/ard\.json/u);
  assert.match(robots, new RegExp(`Agentmap: ${ARD_URL.replaceAll('.', '\\.')}`));
});

test('public agent documentation links to the ARD manifest', () => {
  for (const path of ['auth.md', 'docs/api.md', 'llms.txt', 'llms-full.txt']) {
    assert.match(readFileSync(join(PUBLIC_DIR, path), 'utf8'), new RegExp(ARD_URL.replaceAll('.', '\\.')));
  }
});
