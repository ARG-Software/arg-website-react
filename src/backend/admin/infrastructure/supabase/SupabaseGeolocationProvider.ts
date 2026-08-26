import type { SupabaseClient } from '@supabase/supabase-js';

import type { IVisitGeolocationProvider } from '../../application/ports/IVisitGeolocationProvider.js';
import type { VisitGeolocationInput } from '../../domain/types/VisitTypes.js';

interface ISupabaseGeoLocationRow {
  country_code: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
}

export class SupabaseGeolocationProvider implements IVisitGeolocationProvider {
  constructor(private readonly client: SupabaseClient) {}

  async lookup(clientIp: string): Promise<VisitGeolocationInput> {
    if (!clientIp || clientIp === 'unknown') return createEmptyGeolocation();

    const { data, error } = (await this.client.rpc('lookup_geo_location', {
      p_client_ip: clientIp,
    })) as { data: unknown; error: Error | null };

    if (error || !data) return createEmptyGeolocation();

    const row = Array.isArray(data) ? data[0] : data;
    return normalizeGeolocation(toGeoLocation(row));
  }
}

function createEmptyGeolocation(): VisitGeolocationInput {
  return {
    countryCode: null,
    region: null,
    city: null,
    timezone: null,
  };
}

function toGeoLocation(row: unknown): VisitGeolocationInput {
  if (!row || typeof row !== 'object') return createEmptyGeolocation();

  const value = row as ISupabaseGeoLocationRow;
  return {
    countryCode: value.country_code || null,
    region: value.region || null,
    city: value.city || null,
    timezone: value.timezone || null,
  };
}

function normalizeGeolocation(value: VisitGeolocationInput): VisitGeolocationInput {
  return {
    countryCode: normalizeCountryCode(value.countryCode),
    region: normalizeText(value.region),
    city: normalizeText(value.city),
    timezone: normalizeText(value.timezone),
  };
}

function normalizeCountryCode(value: string | null | undefined): string | null {
  if (!value) return null;

  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

function normalizeText(value: string | null | undefined): string | null {
  if (!value) return null;

  const normalized = value.trim();
  return normalized || null;
}
