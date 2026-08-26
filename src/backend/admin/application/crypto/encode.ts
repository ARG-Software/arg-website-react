import crypto from 'node:crypto';

import { decodeKey } from './decode.js';
import { ENCODING_ALGORITHM, INDEX_ENCODING_ALGORITHM, NONCE_BYTES } from './securityConstants.js';

export type EncodedValue = {
  keyVersion: number;
  nonce: string;
  ciphertext: string;
  authTag: string;
};

export function encode(value: string, key: string, keyVersion: number): EncodedValue {
  const nonce = crypto.randomBytes(NONCE_BYTES);
  const cipher = crypto.createCipheriv(ENCODING_ALGORITHM, decodeKey(key), nonce);
  const plaintext = Buffer.from(value, 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  return {
    keyVersion,
    nonce: nonce.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
}

export function encodeIndex(value: string, key: string): string {
  return crypto.createHmac(INDEX_ENCODING_ALGORITHM, key).update(value).digest('hex');
}
