import crypto from 'node:crypto';

import { Outreach } from '../../domain/outreach.js';
import type { AdminConfig } from '../../apps/config/AdminConfig.js';
import type { OutreachContactMethod, OutreachStatus } from '../../domain/types/OutreachTypes.js';

const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const NONCE_BYTES = 12;

type EncryptedOutreachField = {
  keyVersion: number | null;
  nonce: string | null;
  ciphertext: string | null;
  authTag: string | null;
  blindIndex?: string | null;
};

type ProtectedOutreachField = 'companyName' | 'contactEmail' | 'emailSubject' | 'emailBody';

export function toOutreachRecord(row, config: AdminConfig): Outreach {
  return new Outreach({
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    companyName: decryptRequiredField(toEncryptedField(row, 'company_name'), config),
    website: row.website || '',
    contactEmail: decryptOptionalField(toEncryptedField(row, 'contact_email'), config),
    contactInfo: row.contact_info || '',
    contactMethod: (row.contact_method || 'email') as OutreachContactMethod,
    fitReason: row.fit_reason || '',
    emailSubject: decryptOptionalField(toEncryptedField(row, 'email_subject'), config),
    emailBody: decryptOptionalField(toEncryptedField(row, 'email_body'), config),
    status: (row.status || 'not_sent') as OutreachStatus,
    dateSent: row.date_sent || '',
    followUpDate: row.follow_up_date || '',
    replyObtained: Boolean(row.reply_obtained),
    replySummary: row.reply_summary || '',
    notes: row.notes || '',
  });
}

export function toOutreachDatabaseRow(record: Outreach, config: AdminConfig) {
  return {
    ...toEncryptedColumns('company_name', encryptRequiredField('companyName', record.companyName, config)),
    ...toEncryptedColumns('contact_email', encryptOptionalField('contactEmail', record.contactEmail, config)),
    ...toEncryptedColumns('email_subject', encryptOptionalField('emailSubject', record.emailSubject, config)),
    ...toEncryptedColumns('email_body', encryptOptionalField('emailBody', record.emailBody, config)),
    website: cleanNullable(record.website),
    contact_info: cleanNullable(record.contactInfo),
    contact_method: record.contactMethod,
    fit_reason: cleanNullable(record.fitReason),
    status: record.status,
    date_sent: cleanNullable(record.dateSent),
    follow_up_date: cleanNullable(record.followUpDate),
    reply_obtained: Boolean(record.replyObtained),
    reply_summary: cleanNullable(record.replySummary),
    notes: cleanNullable(record.notes),
  };
}

function toEncryptedField(row, prefix: string): EncryptedOutreachField {
  return {
    keyVersion: row[`${prefix}_key_version`] || null,
    nonce: row[`${prefix}_nonce`] || null,
    ciphertext: row[`${prefix}_ciphertext`] || null,
    authTag: row[`${prefix}_auth_tag`] || null,
    blindIndex: row[`${prefix}_blind_index`] || null,
  };
}

function toEncryptedColumns(prefix: string, field: EncryptedOutreachField) {
  return {
    [`${prefix}_key_version`]: field.keyVersion,
    [`${prefix}_nonce`]: field.nonce,
    [`${prefix}_ciphertext`]: field.ciphertext,
    [`${prefix}_auth_tag`]: field.authTag,
    ...(field.blindIndex !== undefined ? { [`${prefix}_blind_index`]: field.blindIndex } : {}),
  };
}

function cleanNullable(value: string) {
  const cleaned = String(value || '').trim();

  return cleaned || null;
}

function encryptRequiredField(
  field: ProtectedOutreachField,
  value: string,
  config: AdminConfig
): EncryptedOutreachField {
  return encryptField(field, value, config);
}

function encryptOptionalField(
  field: ProtectedOutreachField,
  value: string,
  config: AdminConfig
): EncryptedOutreachField {
  if (!value) return createEmptyEncryptedField();

  return encryptField(field, value, config);
}

function encryptField(
  field: ProtectedOutreachField,
  value: string,
  config: AdminConfig
): EncryptedOutreachField {
  const keyVersion = config.getActiveOutreachEncryptionKeyVersion();
  const key = getEncryptionKey(config, keyVersion);
  const nonce = crypto.randomBytes(NONCE_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, nonce);
  const plaintext = Buffer.from(value, 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const envelope = {
    keyVersion,
    nonce: nonce.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };

  if (field === 'companyName' || field === 'contactEmail') {
    return { ...envelope, blindIndex: createBlindIndex(field, value, config) };
  }

  return envelope;
}

function decryptRequiredField(encryptedField: EncryptedOutreachField, config: AdminConfig): string {
  return decryptField(encryptedField, config);
}

function decryptOptionalField(encryptedField: EncryptedOutreachField, config: AdminConfig): string {
  if (!encryptedField.ciphertext) return '';

  return decryptField(encryptedField, config);
}

function decryptField(encryptedField: EncryptedOutreachField, config: AdminConfig): string {
  const keyVersion = Number(encryptedField.keyVersion);
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getEncryptionKey(config, keyVersion),
    Buffer.from(String(encryptedField.nonce), 'base64')
  );
  decipher.setAuthTag(Buffer.from(String(encryptedField.authTag), 'base64'));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(String(encryptedField.ciphertext), 'base64')),
    decipher.final(),
  ]);

  return plaintext.toString('utf8');
}

function createEmptyEncryptedField(): EncryptedOutreachField {
  return {
    keyVersion: null,
    nonce: null,
    ciphertext: null,
    authTag: null,
    blindIndex: null,
  };
}

function createBlindIndex(
  field: ProtectedOutreachField,
  value: string,
  config: AdminConfig
): string | null {
  const normalizedValue = field === 'contactEmail' ? normalizeEmail(value) : normalizeCompanyName(value);
  if (!normalizedValue) return null;

  return crypto
    .createHmac('sha256', config.getOutreachBlindIndexKey())
    .update(`${field}:${normalizedValue}`)
    .digest('hex');
}

function getEncryptionKey(config: AdminConfig, version: number): Buffer {
  const value = config.getOutreachEncryptionKey(version);
  if (!value) throw new Error(`Missing outreach encryption key for version ${version}`);

  const key = decodeKey(value);
  if (key.length !== KEY_BYTES) {
    throw new Error(`Outreach encryption key version ${version} must decode to 32 bytes`);
  }

  return key;
}

function normalizeCompanyName(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeEmail(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function decodeKey(value: string): Buffer {
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
