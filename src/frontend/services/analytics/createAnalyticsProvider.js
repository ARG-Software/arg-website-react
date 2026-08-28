import { FirstPartyAnalyticsProvider } from './providers/firstPartyAnalyticsProvider.js';
import { GoogleAnalyticsProvider } from './providers/googleAnalyticsProvider.js';
import { NoopAnalyticsProvider } from './providers/noopAnalyticsProvider.js';

export function createAnalyticsProvider() {
  const provider = import.meta.env.VITE_ANALYTICS_PROVIDER || 'ga4';

  if (provider === 'both') {
    return new MultiAnalyticsProvider([
      new GoogleAnalyticsProvider(),
      new FirstPartyAnalyticsProvider(),
    ]);
  }

  if (provider === 'firstParty') return new FirstPartyAnalyticsProvider();
  if (provider === 'none') return new NoopAnalyticsProvider();

  return new GoogleAnalyticsProvider();
}

class MultiAnalyticsProvider {
  constructor(providers) {
    this.providers = providers;
  }

  trackEvent(eventName, params = {}) {
    for (const provider of this.providers) {
      provider.trackEvent(eventName, params);
    }
  }
}
