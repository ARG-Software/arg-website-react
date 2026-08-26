import type { VisitGeolocationInput } from '../../domain/types/VisitTypes.js';

export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-nf-client-connection-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

export function getHeaderGeolocation(request: Request): VisitGeolocationInput {
  return normalizeGeolocation({
    countryCode: request.headers.get('x-country') || request.headers.get('cf-ipcountry'),
  });
}

export function hasGeolocation(value: VisitGeolocationInput): boolean {
  return Boolean(value.countryCode || value.region || value.city || value.timezone);
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
