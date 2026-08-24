import type { IOutreachRepository } from '../../application/ports/repositories/IOutreachRepository.js';
import type { Outreach } from '../../domain/outreach.js';
import type { AdminConfig } from '../../apps/config/AdminConfig.js';
import { toOutreachDatabaseRow, toOutreachRecord } from './outreachRows.js';

export class SupabaseOutreachRepository implements IOutreachRepository {
  constructor(private readonly client: any, private readonly config: AdminConfig) {}

  async list() {
    const { data, error } = await this.client
      .from('outreach_records')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(row => toOutreachRecord(row, this.config));
  }

  async findById(id) {
    const { data, error } = await this.client
      .from('outreach_records')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return toOutreachRecord(data, this.config);
  }

  async save(outreach: Outreach) {
    const { data, error } = await this.client
      .from('outreach_records')
      .update(toOutreachDatabaseRow(outreach, this.config))
      .eq('id', outreach.id)
      .select('*')
      .single();

    if (error) throw error;

    return toOutreachRecord(data, this.config);
  }

  async createMany(outreaches: Outreach[]) {
    if (!outreaches.length) return [];

    const rows = outreaches.map(outreach => toOutreachDatabaseRow(outreach, this.config));
    const { data, error } = await this.client.from('outreach_records').insert(rows).select('*');

    if (error) throw error;

    return data.map(row => toOutreachRecord(row, this.config));
  }
}
