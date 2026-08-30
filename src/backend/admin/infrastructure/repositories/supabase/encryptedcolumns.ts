import { isValidKey } from '../../../application/crypto/decode.js';
import type { EncodedValue } from '../../../application/crypto/encode.js';

export type EncryptedColumnField = {
  keyVersion: number | null;
  nonce: string | null;
  ciphertext: string | null;
  authTag: string | null;
  blindIndex?: string | null;
};

export type SupabaseRowValue = string | number | boolean | null | undefined;
export type SupabaseRow = Record<string, SupabaseRowValue>;

export function readEncodedField(row: SupabaseRow, prefix: string): EncryptedColumnField {
  return {
    keyVersion: (row[`${prefix}_key_version`] as number | null) || null,
    nonce: (row[`${prefix}_nonce`] as string | null) || null,
    ciphertext: (row[`${prefix}_ciphertext`] as string | null) || null,
    authTag: (row[`${prefix}_auth_tag`] as string | null) || null,
    blindIndex: (row[`${prefix}_blind_index`] as string | null) || null,
  };
}

export function createEncodedColumns(
  prefix: string,
  field: EncryptedColumnField
): Record<string, string | number | null> {
  const columns: Record<string, number | string | null> = {
    [`${prefix}_key_version`]: field.keyVersion,
    [`${prefix}_nonce`]: field.nonce,
    [`${prefix}_ciphertext`]: field.ciphertext,
    [`${prefix}_auth_tag`]: field.authTag,
  };

  if (field.blindIndex !== undefined) columns[`${prefix}_blind_index`] = field.blindIndex;

  return columns;
}

export function toEncodedValue(field: EncryptedColumnField): EncodedValue {
  return {
    keyVersion: Number(field.keyVersion),
    nonce: String(field.nonce),
    ciphertext: String(field.ciphertext),
    authTag: String(field.authTag),
  };
}

export function createEmptyEncodedField(): EncryptedColumnField {
  return {
    keyVersion: null,
    nonce: null,
    ciphertext: null,
    authTag: null,
    blindIndex: null,
  };
}

export function validateEncryptionKey(value: string, label: string): string {
  if (!value) throw new Error(`Missing ${label}`);
  if (!isValidKey(value)) throw new Error(`${label} must decode to 32 bytes`);

  return value;
}

export function toNullableText(value: string): string | null {
  const trimmed = String(value || '').trim();

  return trimmed || null;
}
