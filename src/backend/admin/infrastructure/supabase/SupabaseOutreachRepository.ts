import type { IOutreachRepository } from '../../application/ports/IOutreachRepository.js';
import { toOutreachDatabaseRow, toOutreachRecord } from './outreachRows.js';

export class SupabaseOutreachRepository implements IOutreachRepository {
  constructor(private readonly client: any, private readonly securityCodec: any) {}

  async list() {
    const { data, error } = await this.client
      .from('outreach_records')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(row => toOutreachRecord(row, this.securityCodec));
  }

  async findById(id) {
    const { data, error } = await this.client
      .from('outreach_records')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return toOutreachRecord(data, this.securityCodec);
  }

  async savePayload(id, payload) {
    const { data, error } = await this.client
      .from('outreach_records')
      .update(toOutreachDatabaseRow(payload, this.securityCodec))
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    return toOutreachRecord(data, this.securityCodec);
  }

  async createMany(payloads) {
    if (!payloads.length) return [];

    const rows = payloads.map(payload => toOutreachDatabaseRow(payload, this.securityCodec));
    const { data, error } = await this.client.from('outreach_records').insert(rows).select('*');

    if (error) throw error;

    return data.map(row => toOutreachRecord(row, this.securityCodec));
  }
}
