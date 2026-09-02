const LOW_ENGAGEMENT_DURATION_MS = 3000;

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

export function isKnownVisitBotUserAgent(userAgent: string | null): boolean {
  const normalized = userAgent?.toLowerCase() || '';
  if (!normalized) return false;

  return BOT_USER_AGENT_PARTS.some(part => normalized.includes(part));
}

export function shouldSkipVisitPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;

  const visit = payload as {
    events?: unknown[];
    pageViews?: unknown[];
    referrer?: unknown;
    attribution?: Record<string, unknown>;
  };
  const pageViews = Array.isArray(visit.pageViews) ? visit.pageViews : [];

  return (
    pageViews.length === 1 &&
    countMeaningfulEvents(visit.events) === 0 &&
    getDurationMs(pageViews) < LOW_ENGAGEMENT_DURATION_MS &&
    !hasAttribution(visit)
  );
}

function countMeaningfulEvents(events: unknown): number {
  if (!Array.isArray(events)) return 0;

  return events.filter(event => {
    if (!event || typeof event !== 'object') return false;

    const name = (event as { name?: unknown }).name;
    return typeof name === 'string' && name.trim() !== '' && name !== 'page_view';
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
