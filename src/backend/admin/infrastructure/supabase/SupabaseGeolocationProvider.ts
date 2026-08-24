import {
  createEmptyGeoLocation,
  normalizeGeoLocation,
  type IGeolocationProvider,
  type IGeoLocation,
} from '../../application/ports/IGeolocationProvider.js';

interface ISupabaseGeoLocationRow {
  country_code: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
}

interface ISupabaseGeolocationClient {
  rpc(name: string, params: Record<string, unknown>): unknown;
}

export class SupabaseGeolocationProvider implements IGeolocationProvider {
  constructor(private readonly client: ISupabaseGeolocationClient) {}

  async lookup(clientIp: string): Promise<IGeoLocation> {
    if (!clientIp || clientIp === 'unknown') return createEmptyGeoLocation();

    const { data, error } = (await this.client.rpc('lookup_geo_location', {
      p_client_ip: clientIp,
    })) as { data: unknown; error: Error | null };

    if (error || !data) return createEmptyGeoLocation();

    const row = Array.isArray(data) ? data[0] : data;
    return normalizeGeoLocation(toGeoLocation(row));
  }
}

function toGeoLocation(row: unknown): IGeoLocation | null {
  if (!row || typeof row !== 'object') return null;

  const value = row as Partial<ISupabaseGeoLocationRow>;
  return {
    countryCode: value.country_code || null,
    region: value.region || null,
    city: value.city || null,
    timezone: value.timezone || null,
  };
}
