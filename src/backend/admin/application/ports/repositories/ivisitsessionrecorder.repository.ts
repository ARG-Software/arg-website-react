import type { VisitSessionRecord } from '../../../domain/types/visitsession.types.js';

export interface IVisitSessionRecorderRepository {
  recordSession(record: VisitSessionRecord): Promise<void>;
}
