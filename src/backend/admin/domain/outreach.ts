import crypto from 'node:crypto';

import { OutreachDomainError } from './errors/OutreachDomainError.js';

const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const NONCE_BYTES = 12;
const MAX_IMPORT_ROWS = 30;

export type OutreachStatus = 'sent' | 'not_sent';
export type OutreachContactMethod = 'email' | 'contact_form';
export type OutreachProtectedField = 'companyName' | 'contactEmail' | 'emailSubject' | 'emailBody';
export type OutreachField =
  | OutreachProtectedField
  | 'website'
  | 'contactInfo'
  | 'contactMethod'
  | 'fitReason'
  | 'status'
  | 'dateSent'
  | 'followUpDate'
  | 'replyObtained'
  | 'replySummary'
  | 'notes';

export interface OutreachEncryptionConfig {
  activeKeyVersion: number;
  keys: Record<number, string>;
  blindIndexKey: string;
}

export interface OutreachEncryptedField {
  keyVersion: number | null;
  nonce: string | null;
  ciphertext: string | null;
  authTag: string | null;
  blindIndex?: string | null;
}

export interface OutreachEncryptedFields {
  companyName: OutreachEncryptedField;
  contactEmail: OutreachEncryptedField;
  emailSubject: OutreachEncryptedField;
  emailBody: OutreachEncryptedField;
}

export interface OutreachConstructorParams {
  encryption: OutreachEncryptionConfig;
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  companyName: string;
  website?: string;
  contactEmail?: string;
  contactInfo?: string;
  contactMethod: OutreachContactMethod;
  fitReason?: string;
  emailSubject?: string;
  emailBody?: string;
  status: OutreachStatus;
  dateSent?: string;
  followUpDate?: string;
  replyObtained?: boolean;
  replySummary?: string;
  notes?: string;
}

export interface EncryptedOutreachConstructorParams {
  encryption: OutreachEncryptionConfig;
  encryptedFields: OutreachEncryptedFields;
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  website?: string;
  contactInfo?: string;
  contactMethod: OutreachContactMethod;
  fitReason?: string;
  status: OutreachStatus;
  dateSent?: string;
  followUpDate?: string;
  replyObtained?: boolean;
  replySummary?: string;
  notes?: string;
}

export interface OutreachChanges {
  companyName?: string | null;
  website?: string | null;
  contactEmail?: string | null;
  contactInfo?: string | null;
  contactMethod?: OutreachContactMethod | string | null;
  fitReason?: string | null;
  emailSubject?: string | null;
  emailBody?: string | null;
  status?: OutreachStatus | string | null;
  dateSent?: string | null;
  followUpDate?: string | null;
  replyObtained?: boolean | string | null;
  replySummary?: string | null;
  notes?: string | null;
}

export interface OutreachUpdateParams {
  changes: OutreachChanges;
  today: string;
}

export interface OutreachCsvRow {
  companyName?: string;
  website?: string;
  contactEmail?: string;
  contactInfo?: string;
  contactMethod?: string;
  fitReason?: string;
  emailSubject?: string;
  emailBody?: string;
  status?: string;
  dateSent?: string;
  followUpDate?: string;
  replyObtained?: string | boolean;
  replySummary?: string;
  notes?: string;
}

export interface OutreachResponse {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  companyName: string;
  website: string;
  contactEmail: string;
  contactInfo: string;
  contactMethod: OutreachContactMethod;
  fitReason: string;
  emailSubject: string;
  emailBody: string;
  status: OutreachStatus;
  dateSent: string;
  followUpDate: string;
  replyObtained: boolean;
  replySummary: string;
  notes: string;
}

export interface OutreachCsvImportResult {
  records: Outreach[];
  errors: { row: number; error: string }[];
}

export class Outreach {
  static readonly fields: readonly OutreachField[] = [
    'companyName',
    'website',
    'contactEmail',
    'contactInfo',
    'contactMethod',
    'fitReason',
    'emailSubject',
    'emailBody',
    'status',
    'dateSent',
    'followUpDate',
    'replyObtained',
    'replySummary',
    'notes',
  ];

  static readonly statuses: readonly OutreachStatus[] = ['sent', 'not_sent'];
  static readonly contactMethods: readonly OutreachContactMethod[] = ['email', 'contact_form'];

  readonly id?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;

  private encryption: OutreachEncryptionConfig;
  private encryptedFields: OutreachEncryptedFields;
  private plainWebsite = '';
  private plainContactInfo = '';
  private plainContactMethod: OutreachContactMethod = 'email';
  private plainFitReason = '';
  private plainStatus: OutreachStatus = 'not_sent';
  private plainDateSent = '';
  private plainFollowUpDate = '';
  private plainReplyObtained = false;
  private plainReplySummary = '';
  private plainNotes = '';

  constructor(params: OutreachConstructorParams) {
    this.id = params.id;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
    this.encryption = params.encryption;
    this.encryptedFields = createEmptyEncryptedFields();

    this.companyName = params.companyName;
    this.website = params.website || '';
    this.contactEmail = params.contactEmail || '';
    this.contactInfo = params.contactInfo || '';
    this.contactMethod = params.contactMethod;
    this.fitReason = params.fitReason || '';
    this.emailSubject = params.emailSubject || '';
    this.emailBody = params.emailBody || '';
    this.status = params.status;
    this.dateSent = params.dateSent || '';
    this.followUpDate = params.followUpDate || '';
    this.replyObtained = Boolean(params.replyObtained);
    this.replySummary = params.replySummary || '';
    this.notes = params.notes || '';
    this.validate();
  }

  static fromEncrypted(params: EncryptedOutreachConstructorParams): Outreach {
    const outreach = Object.create(Outreach.prototype) as Outreach;
    Object.defineProperty(outreach, 'id', { value: params.id, enumerable: true });
    Object.defineProperty(outreach, 'createdAt', { value: params.createdAt, enumerable: true });
    Object.defineProperty(outreach, 'updatedAt', { value: params.updatedAt, enumerable: true });
    outreach.encryption = params.encryption;
    outreach.encryptedFields = params.encryptedFields;
    outreach.website = params.website || '';
    outreach.contactInfo = params.contactInfo || '';
    outreach.contactMethod = params.contactMethod;
    outreach.fitReason = params.fitReason || '';
    outreach.status = params.status;
    outreach.dateSent = params.dateSent || '';
    outreach.followUpDate = params.followUpDate || '';
    outreach.replyObtained = Boolean(params.replyObtained);
    outreach.replySummary = params.replySummary || '';
    outreach.notes = params.notes || '';
    outreach.validate();

    return outreach;
  }

  static fromCsvRow(row: OutreachCsvRow, today: string, encryption: OutreachEncryptionConfig): Outreach {
    const statusResult = normalizeStatus(row.status || '', row.replyObtained || false);
    const contactMethod = normalizeContactMethod(row.contactMethod || '', row.contactEmail || '');
    const dateSent = toDateString(row.dateSent || '');

    return new Outreach({
      encryption,
      companyName: clean(row.companyName || ''),
      website: clean(row.website || ''),
      contactEmail: clean(row.contactEmail || '').toLowerCase(),
      contactInfo: clean(row.contactInfo || ''),
      contactMethod,
      fitReason: clean(row.fitReason || ''),
      emailSubject: cleanSingleLine(row.emailSubject || ''),
      emailBody: normalizeEmailDraft(row.emailBody || ''),
      status: statusResult.status,
      dateSent: statusResult.status === 'sent' && !dateSent ? today : dateSent,
      followUpDate: toDateString(row.followUpDate || ''),
      replyObtained: statusResult.replyObtained,
      replySummary: clean(row.replySummary || ''),
      notes: clean(row.notes || ''),
    });
  }

  static isField(value: string): value is OutreachField {
    return Outreach.fields.includes(value as OutreachField);
  }

  static isDuplicateError(error: { code?: string; message?: string }): boolean {
    return error.code === '23505' || /duplicate key/i.test(error.message || '');
  }

  static getChangedFields(changes: OutreachChanges): OutreachField[] {
    return Object.keys(changes).filter(Outreach.isField) as OutreachField[];
  }

  get companyName(): string {
    return this.decryptRequiredField('companyName');
  }

  set companyName(value: string) {
    this.encryptedFields.companyName = this.encryptRequiredField('companyName', cleanDisplayValue(value));
  }

  get contactEmail(): string {
    return this.decryptOptionalField('contactEmail');
  }

  set contactEmail(value: string) {
    this.encryptedFields.contactEmail = this.encryptOptionalField('contactEmail', cleanDisplayValue(value));
  }

  get emailSubject(): string {
    return this.decryptOptionalField('emailSubject');
  }

  set emailSubject(value: string) {
    this.encryptedFields.emailSubject = this.encryptOptionalField('emailSubject', cleanSingleLine(value));
  }

  get emailBody(): string {
    return this.decryptOptionalField('emailBody');
  }

  set emailBody(value: string) {
    this.encryptedFields.emailBody = this.encryptOptionalField('emailBody', normalizeEmailDraft(value));
  }

  get website(): string {
    return this.plainWebsite;
  }

  set website(value: string) {
    this.plainWebsite = cleanDisplayValue(value);
  }

  get contactInfo(): string {
    return this.plainContactInfo;
  }

  set contactInfo(value: string) {
    this.plainContactInfo = cleanDisplayValue(value);
  }

  get contactMethod(): OutreachContactMethod {
    return this.plainContactMethod;
  }

  set contactMethod(value: OutreachContactMethod | string) {
    if (!isContactMethod(value)) throw OutreachDomainError.invalidContactMethod();
    this.plainContactMethod = value;
  }

  get fitReason(): string {
    return this.plainFitReason;
  }

  set fitReason(value: string) {
    this.plainFitReason = cleanDisplayValue(value);
  }

  get status(): OutreachStatus {
    return this.plainStatus;
  }

  set status(value: OutreachStatus | string) {
    if (!isStatus(value)) throw OutreachDomainError.invalidStatus();
    this.plainStatus = value;
  }

  get dateSent(): string {
    return this.plainDateSent;
  }

  set dateSent(value: string) {
    this.plainDateSent = toDateString(value);
  }

  get followUpDate(): string {
    return this.plainFollowUpDate;
  }

  set followUpDate(value: string) {
    this.plainFollowUpDate = toDateString(value);
  }

  get replyObtained(): boolean {
    return this.plainReplyObtained;
  }

  set replyObtained(value: boolean | string) {
    this.plainReplyObtained = parseBoolean(value);
  }

  get replySummary(): string {
    return this.plainReplySummary;
  }

  set replySummary(value: string) {
    this.plainReplySummary = cleanDisplayValue(value);
  }

  get notes(): string {
    return this.plainNotes;
  }

  set notes(value: string) {
    this.plainNotes = cleanDisplayValue(value);
  }

  update(params: OutreachUpdateParams): void {
    const changes = sanitizeChanges(params.changes);

    if (this.status === 'sent') {
      this.assertSentRecordLockedFieldUnchanged(changes, 'status', 'status');
      this.assertSentRecordLockedFieldUnchanged(changes, 'contactMethod', 'contact method');
      this.assertSentRecordLockedFieldUnchanged(changes, 'dateSent', 'sent date');
    }

    this.applyChanges(changes);

    if (this.status === 'sent' && !this.dateSent) {
      this.dateSent = params.today;
    }

    this.validate();
  }

  toResponse(): OutreachResponse {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      companyName: this.companyName,
      website: this.website,
      contactEmail: this.contactEmail,
      contactInfo: this.contactInfo,
      contactMethod: this.contactMethod,
      fitReason: this.fitReason,
      emailSubject: this.emailSubject,
      emailBody: this.emailBody,
      status: this.status,
      dateSent: this.dateSent,
      followUpDate: this.followUpDate,
      replyObtained: this.replyObtained,
      replySummary: this.replySummary,
      notes: this.notes,
    };
  }

  getEncryptedFields(): OutreachEncryptedFields {
    return this.encryptedFields;
  }

  private validate(): void {
    if (!this.companyName) throw OutreachDomainError.missingCompanyName();
    if (!isStatus(this.status)) throw OutreachDomainError.invalidStatus();
    if (!isContactMethod(this.contactMethod)) throw OutreachDomainError.invalidContactMethod();
    if (this.status === 'sent' && !this.dateSent) throw OutreachDomainError.missingSentDate();
  }

  private applyChanges(changes: OutreachChanges): void {
    if (changes.companyName !== undefined) this.companyName = stringValue(changes.companyName);
    if (changes.website !== undefined) this.website = stringValue(changes.website);
    if (changes.contactEmail !== undefined) this.contactEmail = stringValue(changes.contactEmail);
    if (changes.contactInfo !== undefined) this.contactInfo = stringValue(changes.contactInfo);
    if (changes.contactMethod !== undefined) this.contactMethod = stringValue(changes.contactMethod);
    if (changes.fitReason !== undefined) this.fitReason = stringValue(changes.fitReason);
    if (changes.emailSubject !== undefined) this.emailSubject = stringValue(changes.emailSubject);
    if (changes.emailBody !== undefined) this.emailBody = stringValue(changes.emailBody);
    if (changes.status !== undefined) this.status = stringValue(changes.status);
    if (changes.dateSent !== undefined) this.dateSent = stringValue(changes.dateSent);
    if (changes.followUpDate !== undefined) this.followUpDate = stringValue(changes.followUpDate);
    if (changes.replyObtained !== undefined) this.replyObtained = changes.replyObtained;
    if (changes.replySummary !== undefined) this.replySummary = stringValue(changes.replySummary);
    if (changes.notes !== undefined) this.notes = stringValue(changes.notes);
  }

  private assertSentRecordLockedFieldUnchanged(
    changes: OutreachChanges,
    field: 'status' | 'contactMethod' | 'dateSent',
    label: string
  ): void {
    if (!(field in changes)) return;

    const value = stringValue(changes[field]);

    if (value === String(this[field])) return;

    throw OutreachDomainError.sentFieldLocked(field, label);
  }

  private encryptRequiredField(field: OutreachProtectedField, value: string): OutreachEncryptedField {
    return this.encryptField(field, value);
  }

  private encryptOptionalField(field: OutreachProtectedField, value: string): OutreachEncryptedField {
    if (!value) return createEmptyEncryptedField();

    return this.encryptField(field, value);
  }

  private encryptField(field: OutreachProtectedField, value: string): OutreachEncryptedField {
    const keyVersion = this.encryption.activeKeyVersion;
    const key = this.getEncryptionKey(keyVersion);
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
      return { ...envelope, blindIndex: this.createBlindIndex(field, value) };
    }

    return envelope;
  }

  private decryptRequiredField(field: OutreachProtectedField): string {
    return this.decryptField(this.encryptedFields[field]);
  }

  private decryptOptionalField(field: OutreachProtectedField): string {
    const encryptedField = this.encryptedFields[field];
    if (!encryptedField.ciphertext) return '';

    return this.decryptField(encryptedField);
  }

  private decryptField(encryptedField: OutreachEncryptedField): string {
    const keyVersion = Number(encryptedField.keyVersion);
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      this.getEncryptionKey(keyVersion),
      Buffer.from(String(encryptedField.nonce), 'base64')
    );
    decipher.setAuthTag(Buffer.from(String(encryptedField.authTag), 'base64'));

    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(String(encryptedField.ciphertext), 'base64')),
      decipher.final(),
    ]);

    return plaintext.toString('utf8');
  }

  private createBlindIndex(field: OutreachProtectedField, value: string): string | null {
    const normalizedValue = field === 'contactEmail' ? normalizeEmail(value) : normalizeCompanyName(value);
    if (!normalizedValue) return null;
    if (!this.encryption.blindIndexKey) throw OutreachDomainError.missingBlindIndexKey();

    return crypto
      .createHmac('sha256', this.encryption.blindIndexKey)
      .update(`${field}:${normalizedValue}`)
      .digest('hex');
  }

  private getEncryptionKey(version: number): Buffer {
    const value = this.encryption.keys[version];
    if (!value) throw OutreachDomainError.missingEncryptionKey(version);

    const key = decodeKey(value);
    if (key.length !== KEY_BYTES) throw OutreachDomainError.invalidEncryptionKey(version);

    return key;
  }
}

export class OutreachCsv {
  static readonly fields: readonly OutreachField[] = Outreach.fields;

  constructor(private readonly records: Outreach[]) {}

  static parse(csv: string, today: string, encryption: OutreachEncryptionConfig): OutreachCsvImportResult {
    const rows = parseCsv(csv);
    if (rows.length > MAX_IMPORT_ROWS) throw OutreachDomainError.tooManyRows();

    const records: Outreach[] = [];
    const errors: { row: number; error: string }[] = [];

    rows.forEach((row, index) => {
      try {
        records.push(Outreach.fromCsvRow(row, today, encryption));
      } catch (error) {
        errors.push({ row: index + 2, error: getErrorMessage(error) });
      }
    });

    return { records, errors };
  }

  toCsv(): string {
    const rows = this.records.map(record => {
      const response = record.toResponse();
      return OutreachCsv.fields.map(field => response[field] ?? '');
    });

    return [OutreachCsv.fields, ...rows].map(row => row.map(escapeCsvCell).join(',')).join('\n');
  }
}

export class OutreachCollection {
  constructor(private readonly records: Outreach[]) {}

  createSummary(): {
    total: number;
    sent: number;
    notSent: number;
    repliesObtained: number;
    sentWithoutReply: number;
  } {
    return this.records.reduce(
      (summary, record) => {
        summary.total += 1;

        if (record.status === 'sent') {
          summary.sent += 1;
          if (record.replyObtained) {
            summary.repliesObtained += 1;
          } else {
            summary.sentWithoutReply += 1;
          }
        } else {
          summary.notSent += 1;
        }

        return summary;
      },
      { total: 0, sent: 0, notSent: 0, repliesObtained: 0, sentWithoutReply: 0 }
    );
  }
}

export function normalizeEmailDraft(value: string): string {
  return String(value || '')
    .replace(/\\n/g, '\n')
    .replace(/\/n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function cleanSingleLine(value: string): string {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function createEmptyEncryptedFields(): OutreachEncryptedFields {
  return {
    companyName: createEmptyEncryptedField(),
    contactEmail: createEmptyEncryptedField(),
    emailSubject: createEmptyEncryptedField(),
    emailBody: createEmptyEncryptedField(),
  };
}

function createEmptyEncryptedField(): OutreachEncryptedField {
  return {
    keyVersion: null,
    nonce: null,
    ciphertext: null,
    authTag: null,
    blindIndex: null,
  };
}

function sanitizeChanges(changes: OutreachChanges): OutreachChanges {
  const sanitized: OutreachChanges = {};

  for (const key of Object.keys(changes)) {
    if (!Outreach.isField(key)) continue;
    const field = key as OutreachField;
    const value = changes[field];

    if (field === 'replyObtained') {
      sanitized.replyObtained = parseBoolean(value || false);
      continue;
    }

    const sanitizedRecord = sanitized as Record<OutreachField, string | boolean | null | undefined>;
    sanitizedRecord[field] = typeof value === 'string' ? value.trim() : stringValue(value);
  }

  if (sanitized.status !== undefined && !isStatus(stringValue(sanitized.status))) {
    throw OutreachDomainError.invalidStatus();
  }

  if (sanitized.contactMethod !== undefined && !isContactMethod(stringValue(sanitized.contactMethod))) {
    throw OutreachDomainError.invalidContactMethod();
  }

  return sanitized;
}

function normalizeStatus(value: string, replyValue: string | boolean): { status: OutreachStatus; replyObtained: boolean } {
  const status = clean(value).toLowerCase();
  const replyObtained = parseBoolean(replyValue);

  if (replyObtained) return { status: 'sent', replyObtained: true };
  if (status === 'sent') return { status: 'sent', replyObtained };
  if (status === 'replied') return { status: 'sent', replyObtained: true };
  if (status === 'not_sent') return { status: 'not_sent', replyObtained: false };

  return { status: 'not_sent', replyObtained: false };
}

function normalizeContactMethod(value: string, contactEmail = ''): OutreachContactMethod {
  const method = clean(value)
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (method.includes('form')) return 'contact_form';
  if (method.includes('mail')) return 'email';
  if (method === 'contact_form' || method === 'form') return 'contact_form';
  if (method === 'email') return 'email';

  return clean(contactEmail) ? 'email' : 'contact_form';
}

function parseCsv(csv: string): OutreachCsvRow[] {
  const table = parseCsvRows(csv).filter(row => row.some(cell => clean(cell)));
  if (!table.length) return [];

  const headers = table[0].map(header => normalizeHeader(header));

  return table.slice(1).map(row => {
    const csvRow: OutreachCsvRow = {};

    headers.forEach((header, index) => {
      if (!header) return;
      const csvRecord = csvRow as Record<string, string>;
      csvRecord[header] = row[index] || '';
    });

    return csvRow;
  });
}

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  row.push(cell);
  rows.push(row);

  return rows;
}

function normalizeHeader(value: string): keyof OutreachCsvRow | '' {
  const words = clean(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .split('_')
    .filter(Boolean);

  if (!words.length) return '';

  return (words[0] +
    words
      .slice(1)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('')) as keyof OutreachCsvRow;
}

function escapeCsvCell(value: string | boolean): string {
  const text = value === null || value === undefined ? '' : String(value);

  if (!/[",\n\r]/.test(text)) return text;

  return `"${text.replace(/"/g, '""')}"`;
}

function toDateString(value: string): string {
  const cleaned = clean(value);
  if (!cleaned) return '';

  const date = new Date(cleaned);
  if (Number.isNaN(date.getTime())) return cleaned;

  return date.toISOString().slice(0, 10);
}

function clean(value: string): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function cleanDisplayValue(value: string): string {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
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

function parseBoolean(value: string | boolean): boolean {
  if (typeof value === 'boolean') return value;
  return ['1', 'true', 'yes', 'y'].includes(clean(value).toLowerCase());
}

function isStatus(value: string): value is OutreachStatus {
  return Outreach.statuses.includes(value as OutreachStatus);
}

function isContactMethod(value: string): value is OutreachContactMethod {
  return Outreach.contactMethods.includes(value as OutreachContactMethod);
}

function stringValue(value: string | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value);
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

function getErrorMessage(error: Error): string {
  return error.message;
}
