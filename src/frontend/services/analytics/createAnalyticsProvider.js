import { FirstPartyAnalyticsProvider } from './providers/firstPartyAnalyticsProvider.js';
import { GoogleAnalyticsProvider } from './providers/googleAnalyticsProvider.js';
import { NoopAnalyticsProvider } from './providers/noopAnalyticsProvider.js';

export function createAnalyticsProvider() {
  const provider = import.meta.env.VITE_ANALYTICS_PROVIDER || 'ga4';

  if (provider === 'firstParty') return new FirstPartyAnalyticsProvider();
  if (provider === 'none') return new NoopAnalyticsProvider();

  return new GoogleAnalyticsProvider();
}
