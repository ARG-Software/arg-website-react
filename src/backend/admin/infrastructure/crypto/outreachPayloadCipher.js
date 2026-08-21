import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const NONCE_BYTES = 12;
const PROTECTED_FIELDS = ['company_name', 'contact_email'];

export function createOutreachPayloadCipher(env = process.env) {
  return {
    encryptFields(payload) {
      return encryptOutreachProtectedFields(payload, env);
    },
    decrypt(row) {
      return decryptOutreachProtectedFields(row, env);
    },
    createBlindIndex(field, value) {
      return createOutreachBlindIndex(field, value, env);
    },
  };
}

export function encryptOutreachProtectedFields(payload, env = process.env) {
  const encrypted = {};

  for (const field of PROTECTED_FIELDS) {
    const value = cleanDisplayValue(payload[field]);

    if (!value && field === 'contact_email') {
      encrypted.contact_email_key_version = null;
      encrypted.contact_email_nonce = null;
      encrypted.contact_email_ciphertext = null;
      encrypted.contact_email_auth_tag = null;
      encrypted.contact_email_blind_index = null;
      continue;
    }

    const fieldEnvelope = encryptOutreachValue(value, env);
    encrypted[`${field}_key_version`] = fieldEnvelope.keyVersion;
    encrypted[`${field}_nonce`] = fieldEnvelope.nonce;
    encrypted[`${field}_ciphertext`] = fieldEnvelope.ciphertext;
    encrypted[`${field}_auth_tag`] = fieldEnvelope.authTag;
    encrypted[`${field}_blind_index`] = createOutreachBlindIndex(field, value, env);
  }

  return encrypted;
}

export function decryptOutreachProtectedFields(row, env = process.env) {
  return {
    company_name: decryptOutreachValue(row, 'company_name', env),
    contact_email: row.contact_email_ciphertext
      ? decryptOutreachValue(row, 'contact_email', env)
      : '',
  };
}

export function encryptOutreachValue(value, env = process.env) {
  const keyVersion = getActiveOutreachKeyVersion(env);
  const key = getOutreachKey(keyVersion, env);
  const nonce = crypto.randomBytes(NONCE_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, nonce);
  const plaintext = Buffer.from(cleanDisplayValue(value), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  return {
    keyVersion,
    nonce: nonce.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
}

export function decryptOutreachValue(row, field, env = process.env) {
  const key = getOutreachKey(row[`${field}_key_version`], env);
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(row[`${field}_nonce`], 'base64')
  );
  decipher.setAuthTag(Buffer.from(row[`${field}_auth_tag`], 'base64'));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(row[`${field}_ciphertext`], 'base64')),
    decipher.final(),
  ]);

  return plaintext.toString('utf8');
}

export function createOutreachBlindIndex(field, value, env = process.env) {
  const normalizedValue =
    field === 'contact_email' ? normalizeEmail(value) : normalizeCompanyName(value);

  if (!normalizedValue) return null;

  return crypto
    .createHmac('sha256', getBlindIndexKey(env))
    .update(`${field}:${normalizedValue}`)
    .digest('hex');
}

export function normalizeCompanyName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function getActiveOutreachKeyVersion(env = process.env) {
  const version = Number(env.OUTREACH_ENCRYPTION_KEY_ACTIVE_VERSION || '1');

  if (!Number.isInteger(version) || version < 1) {
    throw new Error('OUTREACH_ENCRYPTION_KEY_ACTIVE_VERSION must be a positive integer');
  }

  return version;
}

function getOutreachKey(version, env) {
  const value = env[`OUTREACH_ENCRYPTION_KEY_V${version}`] || env.OUTREACH_ENCRYPTION_KEY;

  if (!value) {
    throw new Error(`Missing outreach encryption key for version ${version}`);
  }

  const key = decodeKey(value);

  if (key.length !== KEY_BYTES) {
    throw new Error(`Outreach encryption key version ${version} must decode to 32 bytes`);
  }

  return key;
}

function getBlindIndexKey(env) {
  const value = env.OUTREACH_BLIND_INDEX_KEY || env.OUTREACH_AUDIT_SALT;

  if (!value) {
    throw new Error('Missing outreach blind index key or audit salt');
  }

  return value;
}

function cleanDisplayValue(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
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
