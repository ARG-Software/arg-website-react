import type { SupabaseClient } from '@supabase/supabase-js';

import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { logOperation } from '../../../../shared/logger/logoperation.js';
import type {
  IOutreachRepository,
  OutreachChartRecord,
  OutreachRecordListQuery,
  OutreachRecordListResult,
  OutreachRecordSortField,
} from '../../../application/ports/repositories/ioutreach.repository.js';
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

const RECENT_SENT_LIMIT = 30;
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

export class SupabaseOutreachRepository implements IOutreachRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly config: IAdminConfiguration,
    private readonly logger?: ILogger
  ) {}

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
    if (shouldListInMemory(query)) return this.listRecordsInMemory(query);

    return logOperation(
      this.logger,
      'Supabase outreach records query',
      createOutreachListLogContext(query, false),
      async () => {
        const from = (query.page - 1) * query.pageSize;
        const to = getPageEnd(query, from);

        if (query.recentSent && from >= RECENT_SENT_LIMIT) {
          return createListResult([], Math.min(await this.countRecords(query), RECENT_SENT_LIMIT), query);
        }

        const request = this.createListQuery(query, true).order(getSortColumn(query.sortBy), {
          ascending: query.sortDirection === 'asc',
          nullsFirst: false,
        });

        const { data, error, count } = await request.range(from, to);

        if (error) throw error;

        const totalRecords = query.recentSent ? Math.min(count || 0, RECENT_SENT_LIMIT) : count || 0;
        return createListResult(
          toOutreachRows(data).map(row => createOutreach(row, this.config)),
          totalRecords,
          query
        );
      },
      result => ({ recordCount: result.records.length, totalRecords: result.pagination.totalRecords })
    );
  }

  async getSummary() {
    return logOperation(
      this.logger,
      'Supabase outreach summary query',
      { table: 'outreach_records' },
      async () => {
        const [total, sent, repliesObtained] = await Promise.all([
          this.countSummaryRecords(),
          this.countSummaryRecords({ status: 'sent' }),
          this.countSummaryRecords({ status: 'sent', replyObtained: true }),
        ]);

        return {
          total,
          sent,
          notSent: total - sent,
          repliesObtained,
          sentWithoutReply: sent - repliesObtained,
        };
      },
      result => ({ total: result.total, sent: result.sent, repliesObtained: result.repliesObtained })
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

  private async listRecordsInMemory(query: OutreachRecordListQuery): Promise<OutreachRecordListResult> {
    return logOperation(
      this.logger,
      'Supabase outreach records in-memory query',
      createOutreachListLogContext(query, true),
      async () => {
        let request = this.createListQuery(query, false);

        if (query.recentSent) {
          request = request.order('date_sent', { ascending: false, nullsFirst: false }).limit(RECENT_SENT_LIMIT);
        }

        const { data, error } = await request;

        if (error) throw error;

        const records = sortRecords(
          toOutreachRows(data)
            .map(row => createOutreach(row, this.config))
            .filter(record => isCompanyNameMatch(record, query.companyName)),
          query
        );

        return createListResult(getPageRecords(records, query), records.length, query);
      },
      result => ({ recordCount: result.records.length, totalRecords: result.pagination.totalRecords })
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

    if (query.recentSent) request = request.eq('status', 'sent');
    if (!query.recentSent && query.status) request = request.eq('status', query.status);
    if (query.dateSentFrom) request = request.gte('date_sent', query.dateSentFrom);
    if (query.dateSentTo) request = request.lte('date_sent', query.dateSentTo);

    return request;
  }

  private async countRecords(query: OutreachRecordListQuery): Promise<number> {
    const { error, count } = await this.createListQuery(query, true).limit(0);
    if (error) throw error;

    return count || 0;
  }

  private async countSummaryRecords(filters: { status?: OutreachStatus; replyObtained?: boolean } = {}): Promise<number> {
    let request = this.client.from('outreach_records').select('id', { count: 'exact', head: true });

    if (filters.status) request = request.eq('status', filters.status);
    if (filters.replyObtained !== undefined) request = request.eq('reply_obtained', filters.replyObtained);

    const { error, count } = await request;
    if (error) throw error;

    return count || 0;
  }
}

function toOutreachRows(data: unknown): OutreachRow[] {
  return (data || []) as OutreachRow[];
}

function shouldListInMemory(query: OutreachRecordListQuery): boolean {
  return Boolean(query.companyName) || query.sortBy === 'companyName' || (query.recentSent && query.sortBy !== 'dateSent');
}

function createOutreachListLogContext(query: OutreachRecordListQuery, inMemory: boolean) {
  return {
    table: 'outreach_records',
    inMemory,
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

function getPageEnd(query: OutreachRecordListQuery, from: number): number {
  const to = from + query.pageSize - 1;

  return query.recentSent ? Math.min(to, RECENT_SENT_LIMIT - 1) : to;
}

function createListResult(records: Outreach[], totalRecords: number, query: OutreachRecordListQuery): OutreachRecordListResult {
  return {
    records,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalRecords,
      totalPages: Math.max(1, Math.ceil(totalRecords / query.pageSize)),
    },
  };
}

function isCompanyNameMatch(record: Outreach, companyName = ''): boolean {
  return !companyName || record.companyName.toLowerCase().includes(companyName);
}

function sortRecords(records: Outreach[], query: OutreachRecordListQuery): Outreach[] {
  const direction = query.sortDirection === 'asc' ? 1 : -1;

  return [...records].sort((first, second) => {
    const comparison = compareValues(
      getSortValue(first, query.sortBy),
      getSortValue(second, query.sortBy)
    );

    return comparison * direction;
  });
}

function getSortValue(record: Outreach, field: OutreachRecordSortField): string | number {
  if (field === 'createdAt') return Date.parse(record.createdAt || '') || 0;
  if (field === 'dateSent') return Date.parse(record.dateSent || '') || 0;
  if (field === 'followUpDate') return Date.parse(record.followUpDate || '') || 0;

  return String(record.companyName || '').toLowerCase();
}

function compareValues(first: string | number, second: string | number): number {
  if (typeof first === 'number' && typeof second === 'number') return first - second;

  return String(first).localeCompare(String(second), undefined, { sensitivity: 'base' });
}

function getPageRecords(records: Outreach[], query: OutreachRecordListQuery): Outreach[] {
  const start = (query.page - 1) * query.pageSize;
  return records.slice(start, start + query.pageSize);
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
