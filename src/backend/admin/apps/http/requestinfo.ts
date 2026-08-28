import { getClientIp as getSharedClientIp } from '../../../shared/api/http.js';
import type { VisitGeolocationInput } from '../../domain/types/visit.types.js';

export function getClientIp(request: Request): string {
  return getSharedClientIp(request);
}

export function getHeaderGeolocation(request: Request): VisitGeolocationInput {
  return normalizeGeolocation({
    countryCode: request.headers.get('x-country') || request.headers.get('cf-ipcountry'),
    region: request.headers.get('x-region'),
    city: request.headers.get('x-city'),
    timezone: request.headers.get('x-timezone'),
  });
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
