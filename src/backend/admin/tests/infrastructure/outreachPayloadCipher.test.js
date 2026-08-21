import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createOutreachBlindIndex,
  decryptOutreachProtectedFields,
  encryptOutreachProtectedFields,
  getActiveOutreachKeyVersion,
  normalizeCompanyName,
  normalizeEmail,
} from '../../infrastructure/crypto/outreachPayloadCipher.js';

const TEST_KEY = Buffer.alloc(32, 7).toString('base64');

test('encrypts and decrypts protected outreach fields with the active key version', () => {
  withOutreachKeyEnv(() => {
    const payload = {
      company_name: 'ARG Test Company',
      contact_email: 'Hello@Example.com',
      email_subject: 'Hello from ARG',
      email_body: 'Hi team,\n\nWe can help.',
    };
    const encrypted = encryptOutreachProtectedFields(payload);

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
    assert.deepEqual(decryptOutreachProtectedFields(encrypted), payload);
  });
});

test('normalizes encrypted subject and preserves draft paragraphs', () => {
  withOutreachKeyEnv(() => {
    const encrypted = encryptOutreachProtectedFields({
      company_name: 'ARG Test Company',
      email_subject: '  Hello\nfrom   ARG  ',
      email_body: ' First line  /n/nSecond line\\nThird line   ',
    });

    assert.equal(encrypted.email_subject, undefined);
    assert.equal(encrypted.email_body, undefined);
    assert.deepEqual(decryptOutreachProtectedFields(encrypted), {
      company_name: 'ARG Test Company',
      contact_email: '',
      email_subject: 'Hello from ARG',
      email_body: 'First line\n\nSecond line\nThird line',
    });
  });
});

test('creates normalized blind indexes for uniqueness lookups', () => {
  withOutreachKeyEnv(() => {
    assert.equal(
      createOutreachBlindIndex('company_name', '  Arg   Software '),
      createOutreachBlindIndex('company_name', 'arg software')
    );
    assert.equal(
      createOutreachBlindIndex('contact_email', 'HELLO@ARG.SOFTWARE'),
      createOutreachBlindIndex('contact_email', 'hello@arg.software')
    );
  });
});

test('normalizes protected field values', () => {
  assert.equal(normalizeCompanyName('  Arg   Software  '), 'arg software');
  assert.equal(normalizeEmail(' HELLO@ARG.SOFTWARE '), 'hello@arg.software');
});

test('rejects invalid active outreach key versions', () => {
  withOutreachKeyEnv(() => {
    process.env.OUTREACH_ENCRYPTION_KEY_ACTIVE_VERSION = '0';

    assert.throws(
      () => getActiveOutreachKeyVersion(),
      /OUTREACH_ENCRYPTION_KEY_ACTIVE_VERSION must be a positive integer/
    );
  });
});

test('requires a dedicated blind index key', () => {
  withOutreachKeyEnv(() => {
    delete process.env.OUTREACH_BLIND_INDEX_KEY;
    process.env.OUTREACH_AUDIT_SALT = 'audit-salt-is-not-a-fallback';

    assert.throws(
      () => createOutreachBlindIndex('company_name', 'ARG Software'),
      /Missing outreach blind index key/
    );
  });
});

function withOutreachKeyEnv(callback) {
  const previousActiveVersion = process.env.OUTREACH_ENCRYPTION_KEY_ACTIVE_VERSION;
  const previousV3 = process.env.OUTREACH_ENCRYPTION_KEY_V3;
  const previousBlindIndexKey = process.env.OUTREACH_BLIND_INDEX_KEY;
  const previousAuditSalt = process.env.OUTREACH_AUDIT_SALT;

  process.env.OUTREACH_ENCRYPTION_KEY_ACTIVE_VERSION = '3';
  process.env.OUTREACH_ENCRYPTION_KEY_V3 = TEST_KEY;
  process.env.OUTREACH_BLIND_INDEX_KEY = 'blind-index-test-key';

  try {
    callback();
  } finally {
    restoreEnv('OUTREACH_ENCRYPTION_KEY_ACTIVE_VERSION', previousActiveVersion);
    restoreEnv('OUTREACH_ENCRYPTION_KEY_V3', previousV3);
    restoreEnv('OUTREACH_BLIND_INDEX_KEY', previousBlindIndexKey);
    restoreEnv('OUTREACH_AUDIT_SALT', previousAuditSalt);
  }
}

function restoreEnv(name, value) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
