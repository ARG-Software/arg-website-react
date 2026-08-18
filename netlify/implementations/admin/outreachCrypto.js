import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const NONCE_BYTES = 12;

export function encryptOutreachPayload(payload) {
  const keyVersion = getActiveOutreachKeyVersion();
  const key = getOutreachKey(keyVersion);
  const nonce = crypto.randomBytes(NONCE_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, nonce);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  return {
    payload_key_version: keyVersion,
    payload_nonce: nonce.toString('base64'),
    payload_ciphertext: ciphertext.toString('base64'),
    payload_auth_tag: cipher.getAuthTag().toString('base64'),
  };
}

export function decryptOutreachPayload(row) {
  const key = getOutreachKey(row.payload_key_version);
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(row.payload_nonce, 'base64')
  );
  decipher.setAuthTag(Buffer.from(row.payload_auth_tag, 'base64'));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(row.payload_ciphertext, 'base64')),
    decipher.final(),
  ]);

  return JSON.parse(plaintext.toString('utf8'));
}

export function getActiveOutreachKeyVersion() {
  const version = Number(process.env.OUTREACH_ENCRYPTION_KEY_ACTIVE_VERSION || '1');

  if (!Number.isInteger(version) || version < 1) {
    throw new Error('OUTREACH_ENCRYPTION_KEY_ACTIVE_VERSION must be a positive integer');
  }

  return version;
}

function getOutreachKey(version) {
  const value =
    process.env[`OUTREACH_ENCRYPTION_KEY_V${version}`] || process.env.OUTREACH_ENCRYPTION_KEY;

  if (!value) {
    throw new Error(`Missing outreach encryption key for version ${version}`);
  }

  const key = decodeKey(value);

  if (key.length !== KEY_BYTES) {
    throw new Error(`Outreach encryption key version ${version} must decode to 32 bytes`);
  }

  return key;
}

function decodeKey(value) {
  const trimmed = value.trim();

  if (/^[a-f0-9]{64}$/i.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }

  const base64 = Buffer.from(trimmed, 'base64');
  if (base64.length === KEY_BYTES) {
    return base64;
  }

  return Buffer.from(trimmed, 'utf8');
}
