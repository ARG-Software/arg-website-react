/* ============================================
   Analytics helpers — thin wrapper around gtag
   ============================================ */

/**
 * Fire a GA4 event.  Safe to call even when gtag hasn't loaded yet or
 * consent hasn't been granted — gtag silently queues the hit.
 */
export function trackEvent(eventName, params = {}) {
  if (typeof window.gtag === 'function') {
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

/** Article share clicks. */
export function trackShare(platform, articleSlug) {
  trackEvent('article_share', { platform, article_slug: articleSlug });
}

/** Mailto link clicks. */
export function trackMailto(subject, location) {
  trackEvent('mailto_click', { subject, link_location: location });
}

/** Project modal open. */
export function trackProjectOpen(projectTitle) {
  trackEvent('project_view', { project_title: projectTitle });
}

/** FAQ accordion open. */
export function trackFAQOpen(questionText) {
  trackEvent('faq_open', { question: questionText });
}

/** Article click (from homepage promo or articles list). */
export function trackArticleClick(slug, title, location) {
  trackEvent('article_click', {
    article_slug: slug,
    article_title: title,
    link_location: location,
  });
}

/** Cookie consent response. */
export function trackConsent(action) {
  trackEvent('cookie_consent', { consent_action: action });
}
