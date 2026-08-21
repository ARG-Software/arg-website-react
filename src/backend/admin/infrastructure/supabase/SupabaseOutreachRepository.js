import { toOutreachDatabaseRow, toOutreachRecord } from './outreachRows.js';

export class SupabaseOutreachRepository {
  constructor(client, payloadCipher) {
    this.client = client;
    this.payloadCipher = payloadCipher;
  }

  async list() {
    const { data, error } = await this.client
      .from('outreach_records')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(row => toOutreachRecord(row, this.payloadCipher));
  }

  async findById(id) {
    const { data, error } = await this.client
      .from('outreach_records')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return toOutreachRecord(data, this.payloadCipher);
  }

  async savePayload(id, payload) {
    const { data, error } = await this.client
      .from('outreach_records')
      .update(toOutreachDatabaseRow(payload, this.payloadCipher))
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    return toOutreachRecord(data, this.payloadCipher);
  }

  async createMany(payloads) {
    if (!payloads.length) return [];

    const rows = payloads.map(payload => toOutreachDatabaseRow(payload, this.payloadCipher));
    const { data, error } = await this.client.from('outreach_records').insert(rows).select('*');

    if (error) throw error;

    return data.map(row => toOutreachRecord(row, this.payloadCipher));
  }
}
