import {
  createEmptyGeoLocation,
  type IGeolocationProvider,
  type IGeoLocation,
} from '../../application/ports/IGeolocationProvider.js';

export class FallbackGeolocationProvider implements IGeolocationProvider {
  constructor(private readonly providers: IGeolocationProvider[]) {}

  async lookup(clientIp: string, headers: Headers): Promise<IGeoLocation> {
    for (const provider of this.providers) {
      const geo = await provider.lookup(clientIp, headers);
      if (geo.countryCode || geo.region || geo.city || geo.timezone) return geo;
    }

    return createEmptyGeoLocation();
  }
}
