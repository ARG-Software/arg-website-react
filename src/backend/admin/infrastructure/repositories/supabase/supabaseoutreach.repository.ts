import type { SupabaseClient } from '@supabase/supabase-js';

import type { IOutreachRepository } from '../../../application/ports/repositories/ioutreach.repository.js';
import { decode, isValidKey } from '../../../application/crypto/decode.js';
import {
  encode,
  encodeIndex,
  type EncodedValue,
} from '../../../application/crypto/encode.js';
import type { IAdminConfiguration } from '../../../application/config/iadmin.configuration.js';
import { Outreach } from '../../../domain/outreach.js';
import type { OutreachContactMethod, OutreachStatus } from '../../../domain/types/outreach.types.js';

type EncodedOutreachField = {
  keyVersion: number | null;
  nonce: string | null;
  ciphertext: string | null;
  authTag: string | null;
  blindIndex?: string | null;
};

type ProtectedOutreachField = 'companyName' | 'contactEmail' | 'emailSubject' | 'emailBody';
type SupabaseRowValue = string | number | boolean | null | undefined;
type OutreachRow = Record<string, SupabaseRowValue>;

export class SupabaseOutreachRepository implements IOutreachRepository {
  constructor(private readonly client: SupabaseClient, private readonly config: IAdminConfiguration) {}

  async list(): Promise<Outreach[]> {
    const { data, error } = await this.client
      .from('outreach_records')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(row => createOutreach(row, this.config));
  }

  async findById(id: string): Promise<Outreach | null> {
    const { data, error } = await this.client
      .from('outreach_records')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return createOutreach(data, this.config);
  }

  async save(outreach: Outreach): Promise<Outreach> {
    const { data, error } = await this.client
      .from('outreach_records')
      .update(createOutreachRow(outreach, this.config))
      .eq('id', outreach.id)
      .select('*')
      .single();

    if (error) throw error;

    return createOutreach(data, this.config);
  }

  async createMany(outreaches: Outreach[]): Promise<Outreach[]> {
    if (!outreaches.length) return [];

    const rows = outreaches.map(outreach => createOutreachRow(outreach, this.config));
    const { data, error } = await this.client.from('outreach_records').insert(rows).select('*');

    if (error) throw error;

    return data.map(row => createOutreach(row, this.config));
  }
}

function createOutreach(row: OutreachRow, config: IAdminConfiguration): Outreach {
  return new Outreach({
    id: row.id as string | undefined,
    createdAt: row.created_at as string | undefined,
    updatedAt: row.updated_at as string | undefined,
    companyName: decodeRequiredField(readEncodedField(row, 'company_name'), config),
    website: (row.website as string) || '',
    contactEmail: decodeOptionalField(readEncodedField(row, 'contact_email'), config),
    contactInfo: (row.contact_info as string) || '',
    contactMethod: ((row.contact_method as string) || 'email') as OutreachContactMethod,
    fitReason: (row.fit_reason as string) || '',
    emailSubject: decodeOptionalField(readEncodedField(row, 'email_subject'), config),
    emailBody: decodeOptionalField(readEncodedField(row, 'email_body'), config),
    status: ((row.status as string) || 'not_sent') as OutreachStatus,
    dateSent: (row.date_sent as string) || '',
    followUpDate: (row.follow_up_date as string) || '',
    replyObtained: Boolean(row.reply_obtained),
    replySummary: (row.reply_summary as string) || '',
    notes: (row.notes as string) || '',
  });
}

function createOutreachRow(
  record: Outreach,
  config: IAdminConfiguration
): Record<string, string | number | boolean | null> {
  return {
    ...createEncodedColumns(
      'company_name',
      encodeRequiredField('companyName', record.companyName, config)
    ),
    ...createEncodedColumns(
      'contact_email',
      encodeOptionalField('contactEmail', record.contactEmail, config)
    ),
    ...createEncodedColumns(
      'email_subject',
      encodeOptionalField('emailSubject', record.emailSubject, config)
    ),
    ...createEncodedColumns(
      'email_body',
      encodeOptionalField('emailBody', record.emailBody, config)
    ),
    website: toNullable(record.website),
    contact_info: toNullable(record.contactInfo),
    contact_method: record.contactMethod,
    fit_reason: toNullable(record.fitReason),
    status: record.status,
    date_sent: toNullable(record.dateSent),
    follow_up_date: toNullable(record.followUpDate),
    reply_obtained: Boolean(record.replyObtained),
    reply_summary: toNullable(record.replySummary),
    notes: toNullable(record.notes),
  };
}

function readEncodedField(row: OutreachRow, prefix: string): EncodedOutreachField {
  return {
    keyVersion: (row[`${prefix}_key_version`] as number | null) || null,
    nonce: (row[`${prefix}_nonce`] as string | null) || null,
    ciphertext: (row[`${prefix}_ciphertext`] as string | null) || null,
    authTag: (row[`${prefix}_auth_tag`] as string | null) || null,
    blindIndex: (row[`${prefix}_blind_index`] as string | null) || null,
  };
}

function createEncodedColumns(
  prefix: string,
  field: EncodedOutreachField
): Record<string, string | number | null> {
  const columns: Record<string, number | string | null> = {
    [`${prefix}_key_version`]: field.keyVersion,
    [`${prefix}_nonce`]: field.nonce,
    [`${prefix}_ciphertext`]: field.ciphertext,
    [`${prefix}_auth_tag`]: field.authTag,
  };

  if (field.blindIndex !== undefined) {
    columns[`${prefix}_blind_index`] = field.blindIndex;
  }

  return columns;
}

function encodeRequiredField(
  field: ProtectedOutreachField,
  value: string,
  config: IAdminConfiguration
): EncodedOutreachField {
  return encodeField(field, value, config);
}

function encodeOptionalField(
  field: ProtectedOutreachField,
  value: string,
  config: IAdminConfiguration
): EncodedOutreachField {
  if (!value) return createEmptyEncodedField();

  return encodeField(field, value, config);
}

function encodeField(
  field: ProtectedOutreachField,
  value: string,
  config: IAdminConfiguration
): EncodedOutreachField {
  const keyVersion = config.getActiveOutreachEncryptionKeyVersion();
  const encoded = encode(value, getOutreachEncryptionKey(config, keyVersion), keyVersion);

  if (field !== 'companyName' && field !== 'contactEmail') {
    return encoded;
  }

  const normalizedValue =
    field === 'contactEmail' ? normalizeEmail(value) : normalizeCompanyName(value);
  const blindIndex = normalizedValue
    ? encodeIndex(`${field}:${normalizedValue}`, config.getOutreachBlindIndexKey())
    : null;

  return { ...encoded, blindIndex };
}

function decodeRequiredField(field: EncodedOutreachField, config: IAdminConfiguration): string {
  return decodeField(field, config);
}

function decodeOptionalField(field: EncodedOutreachField, config: IAdminConfiguration): string {
  if (!field.ciphertext) return '';

  return decodeField(field, config);
}

function decodeField(field: EncodedOutreachField, config: IAdminConfiguration): string {
  return decode(toEncodedValue(field), getOutreachEncryptionKey(config, Number(field.keyVersion)));
}

function toEncodedValue(field: EncodedOutreachField): EncodedValue {
  return {
    keyVersion: Number(field.keyVersion),
    nonce: String(field.nonce),
    ciphertext: String(field.ciphertext),
    authTag: String(field.authTag),
  };
}

function createEmptyEncodedField(): EncodedOutreachField {
  return {
    keyVersion: null,
    nonce: null,
    ciphertext: null,
    authTag: null,
    blindIndex: null,
  };
}

function getOutreachEncryptionKey(config: IAdminConfiguration, version: number): string {
  const value = config.getOutreachEncryptionKey(version);
  if (!value) throw new Error(`Missing outreach encryption key for version ${version}`);
  if (!isValidKey(value)) {
    throw new Error(`Outreach encryption key version ${version} must decode to 32 bytes`);
  }

  return value;
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

function toNullable(value: string): string | null {
  const trimmed = String(value || '').trim();

  return trimmed || null;
}
