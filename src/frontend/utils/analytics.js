/* ============================================
   Analytics helpers — thin wrapper around gtag
   ============================================ */

const ADMIN_PATH_PATTERN = /^\/admin(?:\/|$)/;

function isAdminPath(path) {
  return typeof path === 'string' && ADMIN_PATH_PATTERN.test(path);
}

function getCurrentPath() {
  if (typeof window === 'undefined') return '';
  return window.location.pathname;
}

function shouldTrack(params) {
  const eventPath = typeof params?.page_path === 'string' ? params.page_path : getCurrentPath();
  return !isAdminPath(eventPath);
}

/**
 * Fire a GA4 event. Safe to call even when gtag hasn't loaded yet;
 * gtag queues the hit once the bootstrap script exists.
 */
export function trackEvent(eventName, params = {}) {
  if (shouldTrack(params) && typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
}

/** Manual page_view for SPA route changes. */
export function trackPageView(path, title) {
  trackEvent('page_view', {
    page_path: path,
    page_title: title || document.title,
  });
}

/** CTA button clicks (book meeting, typeform, portfolio, etc.) */
export function trackCTA(type, location) {
  trackEvent('cta_click', { cta_type: type, cta_location: location });
}

/** Outbound link clicks (external websites). */
export function trackOutbound(url, label, location) {
  trackEvent('outbound_click', { link_url: url, link_label: label, link_location: location });
}

/** Social link clicks. */
export function trackSocial(platform, location) {
  trackEvent('social_click', { platform, link_location: location });
}

/** Blog post share clicks. */
export function trackBlogPostShare(platform, blogPostSlug) {
  trackEvent('blog_post_share', { platform, blog_post_slug: blogPostSlug });
}

/** Mailto link clicks. */
export function trackMailto(subject, location) {
  trackEvent('mailto_click', { subject, link_location: location });
}

/** Time on page. */
export function trackTimeOnPage(pagePath, durationSeconds) {
  trackEvent('time_on_page', { page_path: pagePath, duration_seconds: durationSeconds });
}

/** FAQ accordion open. */
export function trackFAQOpen(questionText) {
  trackEvent('faq_open', { question: questionText });
}

/** Blog post click (from homepage promo or blog list). */
export function trackBlogPostClick(slug, title, location) {
  trackEvent('blog_post_click', {
    blog_post_slug: slug,
    blog_post_title: title,
    link_location: location,
  });
}

/** Cookie consent response. */
export function trackConsent(action) {
  trackEvent('cookie_consent', { consent_action: action });
}

/** Gaspar assistant events. */
export function trackAssistantEvent(action, data = {}) {
  trackEvent(`assistant_${action}`, data);
}
