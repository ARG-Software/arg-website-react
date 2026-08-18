import assert from 'node:assert/strict';
import test from 'node:test';

import {
  decryptOutreachPayload,
  encryptOutreachPayload,
  getActiveOutreachKeyVersion,
} from '../../backend/admin/infrastructure/crypto/outreachPayloadCipher.js';

const TEST_KEY = Buffer.alloc(32, 7).toString('base64');

test('encrypts and decrypts outreach payloads with the active key version', () => {
  withOutreachKeyEnv(() => {
    const payload = {
      company_name: 'ARG Test Company',
      status: 'ready',
      email_body: 'Hello from a test.',
    };
    const encrypted = encryptOutreachPayload(payload);

    assert.equal(encrypted.payload_key_version, 3);
    assert.ok(encrypted.payload_nonce);
    assert.ok(encrypted.payload_ciphertext);
    assert.ok(encrypted.payload_auth_tag);
    assert.deepEqual(decryptOutreachPayload(encrypted), payload);
  });
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

function withOutreachKeyEnv(callback) {
  const previousActiveVersion = process.env.OUTREACH_ENCRYPTION_KEY_ACTIVE_VERSION;
  const previousV3 = process.env.OUTREACH_ENCRYPTION_KEY_V3;

  process.env.OUTREACH_ENCRYPTION_KEY_ACTIVE_VERSION = '3';
  process.env.OUTREACH_ENCRYPTION_KEY_V3 = TEST_KEY;

  try {
    callback();
  } finally {
    restoreEnv('OUTREACH_ENCRYPTION_KEY_ACTIVE_VERSION', previousActiveVersion);
    restoreEnv('OUTREACH_ENCRYPTION_KEY_V3', previousV3);
  }
}

function restoreEnv(name, value) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
