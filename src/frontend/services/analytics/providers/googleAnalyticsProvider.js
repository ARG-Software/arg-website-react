export class GoogleAnalyticsProvider {
  trackEvent(eventName, params = {}) {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }
  }
}
