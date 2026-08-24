import type { Outreach } from '../../domain/outreach.js';

export interface IOutreachRepository {
  list(): Promise<Outreach[]>;
  findById(id: string): Promise<Outreach | null>;
  save(outreach: Outreach): Promise<Outreach>;
  createMany(outreaches: Outreach[]): Promise<Outreach[]>;
}

export interface IOutreachAuditRepository {
  recordUpdated(input: {
    actorEmail: string;
    changedFields: string[];
    recordId: string;
  }): Promise<void>;
}
