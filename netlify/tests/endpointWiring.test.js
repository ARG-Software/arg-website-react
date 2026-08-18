import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const NETLIFY_DIR = dirname(dirname(fileURLToPath(import.meta.url)));

test('uses security function names and removes old contact function files', () => {
  assert.equal(existsSync(join(NETLIFY_DIR, 'functions/security-challenge.js')), true);
  assert.equal(existsSync(join(NETLIFY_DIR, 'functions/security-verify.js')), true);
  assert.equal(existsSync(join(NETLIFY_DIR, 'functions/contact-challenge.js')), false);
  assert.equal(existsSync(join(NETLIFY_DIR, 'functions/contact-verify.js')), false);
});

test('security implementation exposes the new security API routes', () => {
  assert.match(
    readNetlifyFile('implementations/security/securityChallenge.js'),
    /path:\s*'\/api\/security\/challenge'/
  );
  assert.match(
    readNetlifyFile('implementations/security/securityVerify.js'),
    /path:\s*'\/api\/security\/verify'/
  );
});

test('function files are thin adapters to implementation modules', () => {
  assert.match(
    readNetlifyFile('functions/security-challenge.js'),
    /handleSecurityChallenge as default/
  );
  assert.match(readNetlifyFile('functions/security-verify.js'), /handleSecurityVerify as default/);
  assert.match(readNetlifyFile('functions/admin-outreach.js'), /handleAdminOutreach as default/);
  assert.match(readNetlifyFile('functions/assistant-ask.js'), /handleAssistantAsk as default/);
});

test('does not reference the removed shared folder or old contact routes', () => {
  const files = [
    'functions/admin-outreach.js',
    'functions/assistant-ask.js',
    'functions/assistant-challenge.js',
    'functions/assistant-ui-copy.js',
    'functions/security-challenge.js',
    'functions/security-verify.js',
    'implementations/admin/outreach.js',
    'implementations/ai/assistantAsk.js',
    'implementations/ai/assistantUiCopy.js',
    'implementations/security/assistantChallenge.js',
    'implementations/security/securityChallenge.js',
    'implementations/security/securityVerify.js',
  ];

  for (const file of files) {
    const content = readNetlifyFile(file);
    assert.doesNotMatch(content, /\.\.\/shared|netlify\/shared/);
    assert.doesNotMatch(content, /\/api\/contact\//);
  }
});

function readNetlifyFile(path) {
  return readFileSync(join(NETLIFY_DIR, path), 'utf8');
}
