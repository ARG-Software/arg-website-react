import type {
  VisitOriginType,
  VisitTrafficInput,
} from '../../domain/types/visitsession.types.js';

const LOW_ENGAGEMENT_DURATION_MS = 10_000;

const BOT_USER_AGENT_PARTS = [
  'bot',
  'crawl',
  'spider',
  'scraper',
  'googlebot',
  'bingbot',
  'ahrefsbot',
  'semrushbot',
  'mj12bot',
  'dotbot',
  'petalbot',
  'yandexbot',
  'baiduspider',
  'gptbot',
  'claudebot',
  'ccbot',
  'bytespider',
  'amazonbot',
  'applebot-extended',
  'perplexitybot',
  'uptimerobot',
  'pingdom',
  'statuscake',
];

const HEADLESS_USER_AGENT_PARTS = ['headlesschrome', 'phantomjs'];
const AUTOMATION_USER_AGENT_PARTS = ['playwright', 'puppeteer', 'selenium'];

export function isKnownVisitBotUserAgent(userAgent: string | null): boolean {
  const normalized = userAgent?.toLowerCase() || '';
  if (!normalized) return false;

  return BOT_USER_AGENT_PARTS.some(part => normalized.includes(part));
}

export function classifyVisitTraffic(
  userAgent: string | null,
  payload: unknown
): VisitTrafficInput {
  const visit = readVisitPayload(payload);
  const browserUserAgent = hasText(visit.browser?.userAgent)
    ? String(visit.browser?.userAgent)
    : null;
  const effectiveUserAgent = userAgent || browserUserAgent;
  const origin = classifyOrigin(effectiveUserAgent, visit.browser);
  const reasons = new Set<string>();
  const normalizedUserAgent = effectiveUserAgent?.toLowerCase() || '';

  if (includesPart(normalizedUserAgent, HEADLESS_USER_AGENT_PARTS)) {
    reasons.add('headless_user_agent');
  }
  if (includesPart(normalizedUserAgent, AUTOMATION_USER_AGENT_PARTS)) {
    reasons.add('automation_user_agent');
  }
  if (visit.browser?.webdriver === true) reasons.add('webdriver');
  if (Array.isArray(visit.browser?.languages) && visit.browser.languages.length === 0) {
    reasons.add('missing_browser_language');
  }
  if (visit.browser?.pluginCount === 0 && origin.originType === 'desktop_browser') {
    reasons.add('desktop_browser_without_plugins');
  }
  if (isLowEngagementVisit(visit)) reasons.add('low_engagement');

  return {
    trafficType: reasons.size ? 'suspected_bot' : 'human',
    trafficReason: reasons.size ? Array.from(reasons).join(',') : 'N/A',
    ...origin,
  };
}

type BrowserContext = {
  userAgent?: unknown;
  webdriver?: unknown;
  languages?: unknown;
  pluginCount?: unknown;
  maxTouchPoints?: unknown;
  userAgentData?: {
    brands?: unknown;
    mobile?: unknown;
  };
};

type VisitPayload = {
  events?: unknown[];
  pageViews?: unknown[];
  referrer?: unknown;
  attribution?: Record<string, unknown>;
  browser?: BrowserContext;
};

function readVisitPayload(payload: unknown): VisitPayload {
  if (!payload || typeof payload !== 'object') return {};

  return payload as VisitPayload;
}

function isLowEngagementVisit(visit: VisitPayload): boolean {
  const pageViews = Array.isArray(visit.pageViews) ? visit.pageViews : [];

  return (
    pageViews.length === 1 &&
    countMeaningfulEvents(visit.events) === 0 &&
    getDurationMs(pageViews) <= LOW_ENGAGEMENT_DURATION_MS &&
    !hasAttribution(visit)
  );
}

function classifyOrigin(
  userAgent: string | null,
  browser?: BrowserContext
): Pick<VisitTrafficInput, 'originName' | 'originType'> {
  const normalized = userAgent?.toLowerCase() || '';
  const originName = getOriginName(normalized, browser);
  let originType: VisitOriginType = 'unknown';

  if (includesPart(normalized, HEADLESS_USER_AGENT_PARTS)) originType = 'headless_browser';
  else if (includesPart(normalized, AUTOMATION_USER_AGENT_PARTS)) originType = 'automation';
  else if (isTablet(normalized, browser)) originType = 'tablet_browser';
  else if (isMobile(normalized, browser)) originType = 'mobile_browser';
  else if (originName !== 'Unknown') originType = 'desktop_browser';

  return { originName, originType };
}

function getOriginName(normalizedUserAgent: string, browser?: BrowserContext): string {
  if (normalizedUserAgent.includes('headlesschrome')) return 'Headless Chrome';
  if (normalizedUserAgent.includes('phantomjs')) return 'PhantomJS';
  if (normalizedUserAgent.includes('playwright')) return 'Playwright';
  if (normalizedUserAgent.includes('puppeteer')) return 'Puppeteer';
  if (normalizedUserAgent.includes('selenium')) return 'Selenium';
  if (/edg(a|ios)?\//u.test(normalizedUserAgent)) return 'Edge';
  if (normalizedUserAgent.includes('opr/')) return 'Opera';
  if (normalizedUserAgent.includes('samsungbrowser/')) return 'Samsung Internet';
  if (normalizedUserAgent.includes('crios/') || normalizedUserAgent.includes('chrome/')) {
    return 'Chrome';
  }
  if (normalizedUserAgent.includes('fxios/') || normalizedUserAgent.includes('firefox/')) {
    return 'Firefox';
  }
  if (
    normalizedUserAgent.includes('safari/') &&
    !normalizedUserAgent.includes('chrome/') &&
    !normalizedUserAgent.includes('chromium/')
  ) {
    return 'Safari';
  }

  return getClientHintOriginName(browser) || 'Unknown';
}

function getClientHintOriginName(browser?: BrowserContext): string {
  const brands = browser?.userAgentData?.brands;
  if (!Array.isArray(brands)) return '';

  const names = brands
    .map(brand => (brand && typeof brand === 'object' ? String(brand.brand || '') : ''))
    .filter(Boolean);
  if (names.some(name => name.includes('Microsoft Edge'))) return 'Edge';
  if (names.some(name => name.includes('Google Chrome'))) return 'Chrome';
  if (names.some(name => name.includes('Opera'))) return 'Opera';
  if (names.some(name => name.includes('Chromium'))) return 'Chromium';

  return '';
}

function isTablet(normalizedUserAgent: string, browser?: BrowserContext): boolean {
  return (
    normalizedUserAgent.includes('ipad') ||
    normalizedUserAgent.includes('tablet') ||
    (normalizedUserAgent.includes('android') && !normalizedUserAgent.includes('mobile')) ||
    (normalizedUserAgent.includes('macintosh') && Number(browser?.maxTouchPoints) > 1)
  );
}

function isMobile(normalizedUserAgent: string, browser?: BrowserContext): boolean {
  return (
    browser?.userAgentData?.mobile === true ||
    normalizedUserAgent.includes('mobile') ||
    normalizedUserAgent.includes('iphone') ||
    normalizedUserAgent.includes('ipod')
  );
}

function includesPart(value: string, parts: string[]): boolean {
  return parts.some(part => value.includes(part));
}

function countMeaningfulEvents(events: unknown): number {
  if (!Array.isArray(events)) return 0;

  return events.filter(event => {
    if (!event || typeof event !== 'object') return false;

    const item = event as { name?: unknown; timestamp?: unknown };
    return (
      typeof item.name === 'string' &&
      item.name.trim() !== '' &&
      item.name !== 'page_view' &&
      typeof item.timestamp === 'string' &&
      item.timestamp.trim() !== ''
    );
  }).length;
}

function getDurationMs(pageViews: unknown[]): number {
  let durationMs = 0;

  for (const pageView of pageViews) {
    if (!pageView || typeof pageView !== 'object') continue;

    durationMs += Math.max(0, Number((pageView as { durationMs?: unknown }).durationMs) || 0);
  }

  return durationMs;
}

function hasAttribution(visit: { referrer?: unknown; attribution?: Record<string, unknown> }): boolean {
  if (hasText(visit.referrer)) return true;

  const attribution = visit.attribution || {};
  return ['referrer', 'source', 'medium', 'campaign', 'term', 'content', 'clickId'].some(key =>
    hasText(attribution[key])
  );
}

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}
