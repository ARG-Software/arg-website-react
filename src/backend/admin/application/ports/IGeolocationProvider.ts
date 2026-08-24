export interface IGeoLocation {
  countryCode: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
}

export interface IGeolocationProvider {
  lookup(clientIp: string, headers: Headers): Promise<IGeoLocation>;
}

export function createEmptyGeoLocation(): IGeoLocation {
  return {
    countryCode: null,
    region: null,
    city: null,
    timezone: null,
  };
}

export function normalizeGeoLocation(value: Partial<IGeoLocation> | null | undefined): IGeoLocation {
  return {
    countryCode: normalizeCountryCode(value?.countryCode),
    region: normalizeText(value?.region),
    city: normalizeText(value?.city),
    timezone: normalizeText(value?.timezone),
  };
}

export function normalizeCountryCode(value: string | null | undefined): string | null {
  if (!value) return null;

  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

export function normalizeText(value: string | null | undefined): string | null {
  if (!value) return null;

  const normalized = value.trim();
  return normalized || null;
}
