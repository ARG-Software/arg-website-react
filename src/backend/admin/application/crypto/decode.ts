import crypto from 'node:crypto';

import type { EncodedValue } from './encode.js';
import { ENCODING_ALGORITHM, KEY_BYTES } from './securityConstants.js';

export function decode(encodedValue: EncodedValue, key: string): string {
  const decipher = crypto.createDecipheriv(
    ENCODING_ALGORITHM,
    decodeKey(key),
    Buffer.from(encodedValue.nonce, 'base64')
  );
  decipher.setAuthTag(Buffer.from(encodedValue.authTag, 'base64'));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encodedValue.ciphertext, 'base64')),
    decipher.final(),
  ]);

  return plaintext.toString('utf8');
}

export function decodeKey(value: string): Buffer {
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

export function isValidKey(value: string): boolean {
  return decodeKey(value).length === KEY_BYTES;
}
