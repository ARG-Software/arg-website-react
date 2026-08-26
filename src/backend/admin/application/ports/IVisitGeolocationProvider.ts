import type { VisitGeolocationInput } from '../../domain/types/VisitTypes.js';

export interface IVisitGeolocationProvider {
  lookup(clientIp: string): Promise<VisitGeolocationInput>;
}
