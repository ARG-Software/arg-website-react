const ADMIN_PATH_PATTERN = /^\/admin(?:\/|$)/;

export class AnalyticsService {
  constructor(provider) {
    this.provider = provider;
  }

  trackEvent(eventName, params = {}) {
    if (!shouldTrack(params)) return;
    this.provider.trackEvent(eventName, params);
  }

  trackPageView(path, title) {
    this.trackEvent('page_view', {
      page_path: path,
      page_title: title || document.title,
    });
  }

  trackCTA(type, location) {
    this.trackEvent('cta_click', { cta_type: type, cta_location: location });
  }

  trackOutbound(url, label, location) {
    this.trackEvent('outbound_click', {
      link_url: url,
      link_label: label,
      link_location: location,
    });
  }

  trackSocial(platform, location) {
    this.trackEvent('social_click', { platform, link_location: location });
  }

  trackBlogPostShare(platform, blogPostSlug) {
    this.trackEvent('blog_post_share', { platform, blog_post_slug: blogPostSlug });
  }

  trackMailto(subject, location) {
    this.trackEvent('mailto_click', { subject, link_location: location });
  }

  trackTimeOnPage(pagePath, durationSeconds) {
    this.trackEvent('time_on_page', { page_path: pagePath, duration_seconds: durationSeconds });
  }

  trackFAQOpen(questionText) {
    this.trackEvent('faq_open', { question: questionText });
  }

  trackBlogPostClick(slug, title, location) {
    this.trackEvent('blog_post_click', {
      blog_post_slug: slug,
      blog_post_title: title,
      link_location: location,
    });
  }

  trackConsent(action) {
    this.trackEvent('cookie_consent', { consent_action: action });
  }

  trackAssistantEvent(action, data = {}) {
    this.trackEvent(`assistant_${action}`, data);
  }
}

function shouldTrack(params) {
  return !isAdminPath(getEventPath(params));
}

function getEventPath(params) {
  if (typeof params?.page_path === 'string') return params.page_path;
  if (typeof window === 'undefined') return '';
  return window.location.pathname;
}

function isAdminPath(path) {
  return typeof path === 'string' && ADMIN_PATH_PATTERN.test(path);
}
