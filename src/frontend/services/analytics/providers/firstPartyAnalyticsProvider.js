const VISIT_LOG_ENDPOINT = '/api/visit-log';
const STORAGE_KEY = 'arg.visitor.session';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export class FirstPartyAnalyticsProvider {
  constructor() {
    this.events = [];
    this.pageViews = [];
    this.activePageView = null;
    this.hasFlushListeners = false;
    this.hasVisibilityListener = false;
  }

  trackEvent(eventName, params = {}) {
    if (typeof window === 'undefined') return;

    const session = this.getSession();
    const timestamp = new Date().toISOString();
    const path = getEventPath(params);
    const event = {
      name: eventName,
      params,
      sequence: session.sequence,
      timestamp,
      path,
    };

    this.ensureListeners();
    this.events.push(event);

    if (eventName === 'page_view') {
      this.startPageView(event, params);
    }
  }

  startPageView(event, params) {
    const now = Date.now();
    this.closeActivePageView(now);
    this.activePageView = {
      path: params.page_path || getEventPath(params),
      title: params.page_title || document.title,
      sequence: event.sequence,
      startedAt: event.timestamp,
      endedAt: null,
      durationMs: 0,
      lastVisibleStartedAt: document.visibilityState === 'hidden' ? null : now,
    };
  }

  closeActivePageView(now = Date.now()) {
    if (!this.activePageView) return;

    this.pauseActivePageView(now);
    this.activePageView.endedAt = new Date(now).toISOString();
    this.pageViews.push({
      path: this.activePageView.path,
      title: this.activePageView.title,
      sequence: this.activePageView.sequence,
      startedAt: this.activePageView.startedAt,
      endedAt: this.activePageView.endedAt,
      durationMs: Math.max(0, Math.round(this.activePageView.durationMs)),
    });
    this.activePageView = null;
  }

  pauseActivePageView(now = Date.now()) {
    if (!this.activePageView?.lastVisibleStartedAt) return;

    this.activePageView.durationMs += now - this.activePageView.lastVisibleStartedAt;
    this.activePageView.lastVisibleStartedAt = null;
  }

  resumeActivePageView(now = Date.now()) {
    if (!this.activePageView || this.activePageView.lastVisibleStartedAt) return;

    this.activePageView.lastVisibleStartedAt = now;
  }

  ensureListeners() {
    if (!this.hasFlushListeners) {
      this.hasFlushListeners = true;
      window.addEventListener('pagehide', () => this.flush(), { capture: true });
      window.addEventListener('beforeunload', () => this.flush(), { capture: true });
    }

    if (!this.hasVisibilityListener) {
      this.hasVisibilityListener = true;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.pauseActivePageView();
          return;
        }

        this.resumeActivePageView();
      });
    }
  }

  flush() {
    if (typeof window === 'undefined') return;

    this.closeActivePageView();
    if (!this.events.length && !this.pageViews.length) return;

    const session = this.readStoredSession();
    const body = JSON.stringify({
      sessionId: session?.sessionId,
      language: navigator.language,
      referrer: document.referrer,
      events: this.events.splice(0, this.events.length),
      pageViews: this.pageViews.splice(0, this.pageViews.length),
    });

    if (window.navigator?.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      if (window.navigator.sendBeacon(VISIT_LOG_ENDPOINT, blob)) {
        return;
      }
    }

    fetch(VISIT_LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      // Analytics must not surface network failures to visitors.
    });
  }

  getSession() {
    const now = Date.now();
    const stored = this.readStoredSession();
    const isExpired = !stored?.lastActivity || now - stored.lastActivity > SESSION_TIMEOUT_MS;
    const session = isExpired
      ? createSession(now)
      : {
          sessionId: stored.sessionId,
          lastActivity: now,
          sequence: (stored.sequence || 0) + 1,
        };

    this.writeStoredSession(session);

    return {
      sessionId: session.sessionId,
      sequence: session.sequence,
    };
  }

  readStoredSession() {
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);
      if (!value) return null;

      const parsed = JSON.parse(value);
      if (!parsed?.sessionId) return null;

      return parsed;
    } catch {
      return null;
    }
  }

  writeStoredSession(session) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Analytics must never block navigation or rendering.
    }
  }
}

function getEventPath(params) {
  if (typeof params?.page_path === 'string') return params.page_path;
  if (typeof window === 'undefined') return '';
  return window.location.pathname;
}

function createSession(now) {
  return {
    sessionId: createSessionId(),
    lastActivity: now,
    sequence: 1,
  };
}

function createSessionId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
