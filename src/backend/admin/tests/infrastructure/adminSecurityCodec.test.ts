import assert from 'node:assert/strict';
import test from 'node:test';

import { AdminConfig } from '../../apps/config/AdminConfig.js';
import {
  AdminSecurityCodec,
  normalizeCompanyName,
  normalizeEmail,
} from '../../application/usecases/security/AdminSecurityCodec.js';

const TEST_KEY = Buffer.alloc(32, 7).toString('base64');
const adminConfigValues = {
  adminDatabaseUrl: 'https://admin-project.supabase.co',
  adminDatabaseServiceRoleKey: 'service-role-key',
  adminDatabaseAnonKey: 'anon-key',
  auditSalt: 'outreach',
  loginRateLimitPerMinute: 6,
  loginRateLimitPerDay: 30,
  loginGlobalRateLimitPerDay: 500,
  loginRateLimitSalt: 'arg-admin-login-rate-limit',
  visitLogRateLimitPerMinute: 6,
  visitLogRateLimitPerDay: 30,
  visitLogGlobalRateLimitPerDay: 500,
  visitLogRateLimitSalt: 'arg-visit-log-rate-limit',
  assistantConversationLogRateLimitPerMinute: 6,
  assistantConversationLogRateLimitPerDay: 30,
  assistantConversationLogGlobalRateLimitPerDay: 500,
  assistantConversationLogRateLimitSalt: 'arg-assistant-conversation-log-rate-limit',
  altchaHmacKey: 'altcha-hmac-key',
  altchaCost: 100,
  altchaCounterMin: 10,
  altchaCounterMax: 50,
  secureCookies: false,
  visitHashKey: 'visit-hash-key',
  outreachEncryptionKeyActiveVersion: 3,
  outreachEncryptionKeys: { 3: TEST_KEY },
  outreachBlindIndexKey: 'blind-index-test-key',
  assistantConversationEncryptionKeyActiveVersion: 1,
  assistantConversationEncryptionKeys: { 1: Buffer.alloc(32, 8).toString('base64') },
};

test('encrypts and decrypts protected outreach fields with the active key version', () => {
  const payload = {
    company_name: 'ARG Test Company',
    contact_email: 'Hello@Example.com',
    email_subject: 'Hello from ARG',
    email_body: 'Hi team,\n\nWe can help.',
  };
  const encrypted = createSecurityCodec().encryptOutreachFields(payload);

  assert.equal(encrypted.company_name_key_version, 3);
  assert.ok(encrypted.company_name_nonce);
  assert.ok(encrypted.company_name_ciphertext);
  assert.ok(encrypted.company_name_auth_tag);
  assert.ok(encrypted.company_name_blind_index);
  assert.equal(encrypted.contact_email_key_version, 3);
  assert.equal(encrypted.email_subject_key_version, 3);
  assert.ok(encrypted.email_subject_ciphertext);
  assert.equal(encrypted.email_subject_blind_index, undefined);
  assert.equal(encrypted.email_body_key_version, 3);
  assert.ok(encrypted.email_body_ciphertext);
  assert.equal(encrypted.email_body_blind_index, undefined);
  assert.deepEqual(createSecurityCodec().decryptOutreachFields(encrypted), payload);
});

test('normalizes encrypted subject and preserves draft paragraphs', () => {
  const encrypted = createSecurityCodec().encryptOutreachFields({
    company_name: 'ARG Test Company',
    email_subject: '  Hello\nfrom   ARG  ',
    email_body: ' First line  /n/nSecond line\\nThird line   ',
  });

  assert.equal(encrypted.email_subject, undefined);
  assert.equal(encrypted.email_body, undefined);
  assert.deepEqual(createSecurityCodec().decryptOutreachFields(encrypted), {
    company_name: 'ARG Test Company',
    contact_email: '',
    email_subject: 'Hello from ARG',
    email_body: 'First line\n\nSecond line\nThird line',
  });
});

test('creates normalized blind indexes for uniqueness lookups', () => {
  assert.equal(
    createSecurityCodec().createOutreachBlindIndex('company_name', '  Arg   Software '),
    createSecurityCodec().createOutreachBlindIndex('company_name', 'arg software')
  );
  assert.equal(
    createSecurityCodec().createOutreachBlindIndex('contact_email', 'HELLO@ARG.SOFTWARE'),
    createSecurityCodec().createOutreachBlindIndex('contact_email', 'hello@arg.software')
  );
});

test('normalizes protected field values', () => {
  assert.equal(normalizeCompanyName('  Arg   Software  '), 'arg software');
  assert.equal(normalizeEmail(' HELLO@ARG.SOFTWARE '), 'hello@arg.software');
});

test('returns configured active outreach key versions', () => {
  assert.equal(createSecurityCodec().getActiveOutreachKeyVersion(), 3);
});

test('requires a dedicated blind index key', () => {
  assert.throws(
    () =>
      createSecurityCodec({ outreachBlindIndexKey: '' }).createOutreachBlindIndex(
        'company_name',
        'ARG Software'
      ),
    /Missing outreach blind index key/
  );
});

function createSecurityCodec(overrides = {}) {
  AdminConfig.reset();
  return new AdminSecurityCodec(AdminConfig.configure({ ...adminConfigValues, ...overrides }));
}
