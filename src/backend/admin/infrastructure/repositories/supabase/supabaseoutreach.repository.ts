import type { SupabaseClient } from '@supabase/supabase-js';

import { SupabaseRepositoryBase } from '../../../../shared/infrastructure/repositories/supabase/supabaserepositorybase.js';
import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { logOperation } from '../../../../shared/logger/logoperation.js';
import type {
  IOutreachRepository,
  OutreachChartRecord,
  OutreachRecordListQuery,
  OutreachRecordListResult,
  OutreachRecordSortField,
} from '../../../application/ports/repositories/ioutreach.repository.js';
import { decode } from '../../../application/crypto/decode.js';
import {
  encode,
  encodeIndex,
} from '../../../application/crypto/encode.js';
import type { IAdminConfiguration } from '../../../application/config/iadmin.configuration.js';
import { Outreach } from '../../../domain/outreach.js';
import type { OutreachContactMethod, OutreachStatus } from '../../../domain/types/outreach.types.js';
import {
  createEmptyEncodedField,
  createEncodedColumns,
  readEncodedField,
  toEncodedValue,
  toNullableText,
  validateEncryptionKey,
  type EncryptedColumnField,
  type SupabaseRow,
} from './encryptedcolumns.js';

type ProtectedOutreachField = 'companyName' | 'contactEmail' | 'emailSubject' | 'emailBody';
type EncodedOutreachField = EncryptedColumnField;
type OutreachRow = SupabaseRow;

const FULL_OUTREACH_COLUMNS = [
  'id',
  'created_at',
  'updated_at',
  'company_name_key_version',
  'company_name_nonce',
  'company_name_ciphertext',
  'company_name_auth_tag',
  'company_name_blind_index',
  'contact_email_key_version',
  'contact_email_nonce',
  'contact_email_ciphertext',
  'contact_email_auth_tag',
  'contact_email_blind_index',
  'website',
  'contact_info',
  'contact_method',
  'fit_reason',
  'email_subject_key_version',
  'email_subject_nonce',
  'email_subject_ciphertext',
  'email_subject_auth_tag',
  'email_body_key_version',
  'email_body_nonce',
  'email_body_ciphertext',
  'email_body_auth_tag',
  'status',
  'date_sent',
  'follow_up_date',
  'reply_obtained',
  'reply_summary',
  'notes',
].join(', ');

const LIST_OUTREACH_COLUMNS = [
  'id',
  'created_at',
  'updated_at',
  'company_name_key_version',
  'company_name_nonce',
  'company_name_ciphertext',
  'company_name_auth_tag',
  'contact_email_key_version',
  'contact_email_nonce',
  'contact_email_ciphertext',
  'contact_email_auth_tag',
  'website',
  'contact_info',
  'status',
  'date_sent',
  'follow_up_date',
  'reply_obtained',
].join(', ');

const CHART_OUTREACH_COLUMNS = 'created_at, updated_at, date_sent, reply_obtained';

export class SupabaseOutreachRepository extends SupabaseRepositoryBase implements IOutreachRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly config: IAdminConfiguration,
    private readonly logger?: ILogger
  ) {
    super();
  }

  async list(): Promise<Outreach[]> {
    return logOperation(
      this.logger,
      'Supabase outreach list query',
      { table: 'outreach_records' },
      async () => {
        const { data, error } = await this.client
          .from('outreach_records')
          .select(FULL_OUTREACH_COLUMNS)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return toOutreachRows(data).map(row => createOutreach(row, this.config));
      },
      result => ({ recordCount: result.length })
    );
  }

  async listRecords(query: OutreachRecordListQuery): Promise<OutreachRecordListResult> {
    return logOperation(
      this.logger,
      'Supabase outreach records query',
      createOutreachListLogContext(query),
      async () => {
        const { from, to } = this.getPageRange(query.page, query.pageSize);
        const request = this.createListQuery(query, true).order(getSortColumn(query.sortBy), {
          ascending: query.sortDirection === 'asc',
          nullsFirst: false,
        });

        const { data, error, count } = await request.range(from, to);

        if (error) throw error;

        return {
          records: toOutreachRows(data).map(row => createOutreach(row, this.config)),
          totalRecords: count || 0,
        };
      },
      result => ({ recordCount: result.records.length, totalRecords: result.totalRecords })
    );
  }

  async listChartRecords({ dateSentFrom = '' }: { dateSentFrom?: string } = {}): Promise<OutreachChartRecord[]> {
    return logOperation(
      this.logger,
      'Supabase outreach chart query',
      { table: 'outreach_records', hasDateSentFrom: Boolean(dateSentFrom) },
      async () => {
        let query = this.client
          .from('outreach_records')
          .select(CHART_OUTREACH_COLUMNS)
          .eq('status', 'sent')
          .order('date_sent', { ascending: true });

        if (dateSentFrom) query = query.gte('date_sent', dateSentFrom);

        const { data, error } = await query;

        if (error) throw error;

        return toOutreachRows(data).map(toChartRecord);
      },
      result => ({ recordCount: result.length })
    );
  }

  async findById(id: string): Promise<Outreach | null> {
    return logOperation(
      this.logger,
      'Supabase outreach record query',
      { table: 'outreach_records', outreachId: id },
      async () => {
        const { data, error } = await this.client
          .from('outreach_records')
          .select(FULL_OUTREACH_COLUMNS)
          .eq('id', id)
          .single();

        if (error || !data) return null;

        return createOutreach(data as unknown as OutreachRow, this.config);
      },
      result => ({ found: Boolean(result) })
    );
  }

  async save(outreach: Outreach): Promise<Outreach> {
    return logOperation(
      this.logger,
      'Supabase outreach record update',
      { table: 'outreach_records', outreachId: outreach.id, status: outreach.status },
      async () => {
        const { data, error } = await this.client
          .from('outreach_records')
          .update(createOutreachRow(outreach, this.config))
          .eq('id', outreach.id)
          .select(FULL_OUTREACH_COLUMNS)
          .single();

        if (error) throw error;

        return createOutreach(data as unknown as OutreachRow, this.config);
      }
    );
  }

  async createMany(outreaches: Outreach[]): Promise<Outreach[]> {
    if (!outreaches.length) return [];

    return logOperation(
      this.logger,
      'Supabase outreach records create',
      { table: 'outreach_records', requestedCount: outreaches.length },
      async () => {
        const rows = outreaches.map(outreach => createOutreachRow(outreach, this.config));
        const { data, error } = await this.client
          .from('outreach_records')
          .insert(rows)
          .select(FULL_OUTREACH_COLUMNS);

        if (error) throw error;

        return toOutreachRows(data).map(row => createOutreach(row, this.config));
      },
      result => ({ createdCount: result.length })
    );
  }

  private createListQuery(query: OutreachRecordListQuery, includeCount: boolean) {
    let request = this.client.from('outreach_records').select(
      LIST_OUTREACH_COLUMNS,
      includeCount
        ? {
            count: 'exact' as const,
          }
        : undefined
    );

    if (query.status) request = request.eq('status', query.status);
    if (query.dateSentFrom) request = request.gte('date_sent', query.dateSentFrom);
    if (query.dateSentTo) request = request.lte('date_sent', query.dateSentTo);

    return request;
  }
}

function toOutreachRows(data: unknown): OutreachRow[] {
  return (data || []) as OutreachRow[];
}

function createOutreachListLogContext(query: OutreachRecordListQuery) {
  return {
    table: 'outreach_records',
    page: query.page,
    pageSize: query.pageSize,
    sortBy: query.sortBy,
    sortDirection: query.sortDirection,
    status: query.status,
    recentSent: query.recentSent,
    hasCompanyNameFilter: Boolean(query.companyName),
    hasDateSentFrom: Boolean(query.dateSentFrom),
    hasDateSentTo: Boolean(query.dateSentTo),
  };
}

function getSortColumn(field: OutreachRecordSortField): string {
  if (field === 'dateSent') return 'date_sent';
  if (field === 'followUpDate') return 'follow_up_date';
  if (field === 'createdAt') return 'created_at';

  return 'created_at';
}

function toChartRecord(row: OutreachRow): OutreachChartRecord {
  return {
    createdAt: row.created_at as string | undefined,
    updatedAt: row.updated_at as string | undefined,
    dateSent: (row.date_sent as string) || '',
    replyObtained: Boolean(row.reply_obtained),
  };
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
    ...createEncodedColumns('company_name', encodeRequiredField('companyName', record.companyName, config)),
    ...createEncodedColumns('contact_email', encodeOptionalField('contactEmail', record.contactEmail, config)),
    ...createEncodedColumns('email_subject', encodeOptionalField('emailSubject', record.emailSubject, config)),
    ...createEncodedColumns('email_body', encodeOptionalField('emailBody', record.emailBody, config)),
    website: toNullableText(record.website),
    contact_info: toNullableText(record.contactInfo),
    contact_method: record.contactMethod,
    fit_reason: toNullableText(record.fitReason),
    status: record.status,
    date_sent: toNullableText(record.dateSent),
    follow_up_date: toNullableText(record.followUpDate),
    reply_obtained: Boolean(record.replyObtained),
    reply_summary: toNullableText(record.replySummary),
    notes: toNullableText(record.notes),
  };
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

function getOutreachEncryptionKey(config: IAdminConfiguration, version: number): string {
  const value = config.getOutreachEncryptionKey(version);
  return validateEncryptionKey(value, `outreach encryption key version ${version}`);
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
