import {
  createEmptyGeoLocation,
  normalizeGeoLocation,
  type IGeolocationProvider,
  type IGeoLocation,
} from '../../application/ports/IGeolocationProvider.js';

export class HeaderGeolocationProvider implements IGeolocationProvider {
  async lookup(_clientIp: string, headers: Headers): Promise<IGeoLocation> {
    if (!headers) return createEmptyGeoLocation();

    return normalizeGeoLocation({
      countryCode: headers.get('x-country') || headers.get('cf-ipcountry'),
    });
  }
}
