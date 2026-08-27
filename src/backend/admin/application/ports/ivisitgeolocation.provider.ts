import type { VisitGeolocationInput } from '../../domain/types/visit.types.js';

export interface IVisitGeolocationProvider {
  lookup(clientIp: string): Promise<VisitGeolocationInput>;
}
