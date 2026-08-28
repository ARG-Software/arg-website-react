import { AnalyticsService } from './analyticsService.js';
import { createAnalyticsProvider } from './createAnalyticsProvider.js';

const analytics = new AnalyticsService(createAnalyticsProvider());

export const trackEvent = analytics.trackEvent.bind(analytics);
export const trackPageView = analytics.trackPageView.bind(analytics);
export const trackCTA = analytics.trackCTA.bind(analytics);
export const trackOutbound = analytics.trackOutbound.bind(analytics);
export const trackSocial = analytics.trackSocial.bind(analytics);
export const trackBlogPostShare = analytics.trackBlogPostShare.bind(analytics);
export const trackMailto = analytics.trackMailto.bind(analytics);
export const trackTimeOnPage = analytics.trackTimeOnPage.bind(analytics);
export const trackFAQOpen = analytics.trackFAQOpen.bind(analytics);
export const trackBlogPostClick = analytics.trackBlogPostClick.bind(analytics);
export const trackConsent = analytics.trackConsent.bind(analytics);
export const trackAssistantEvent = analytics.trackAssistantEvent.bind(analytics);
