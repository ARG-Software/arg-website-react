import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ALREADY_SUBSCRIBED_KEY,
  LEAD_CAPTURE_DISMISSED_CONTEXT_KEY,
  NEVER_SHOW_LEAD_CAPTURE_KEY,
  MOBILE_BREAKPOINT,
} from '../constants';
import { trackEvent } from '../utils/analytics';

const DEFAULT_DELAY_MS = 15000;
const MIN_VISIBLE_RATIO = 0.15;
const SECTION_LOOKUP_RETRY_MS = 150;
const SECTION_LOOKUP_MAX_ATTEMPTS = 20;
const CONTACT_PATH = '/contact';
const EXCLUDED_SECTION_IDS = new Set(['contact']);
const EXCLUDED_CLASS_NAMES = ['hero', 'intro', 'page-header', 'page-cta-wrapper'];

function normalizePath(pathname) {
  return pathname.replace(/\/+$/, '') || '/';
}

function isContactPath(pathname) {
  return normalizePath(pathname) === CONTACT_PATH;
}

function isMobileViewport() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
}

function isSuppressedPermanently() {
  return (
    localStorage.getItem(ALREADY_SUBSCRIBED_KEY) ||
    localStorage.getItem(NEVER_SHOW_LEAD_CAPTURE_KEY)
  );
}

function getDismissedContextKey() {
  try {
    return JSON.parse(sessionStorage.getItem(LEAD_CAPTURE_DISMISSED_CONTEXT_KEY))?.key || '';
  } catch {
    return '';
  }
}

function setDismissedContext(context) {
  sessionStorage.setItem(
    LEAD_CAPTURE_DISMISSED_CONTEXT_KEY,
    JSON.stringify({ key: context.key, path: context.path, section: context.section })
  );
}

function isExcludedSection(section) {
  const className = section.className?.toString().toLowerCase() || '';

  return (
    EXCLUDED_SECTION_IDS.has(section.id) ||
    section.dataset.leadCaptureExclude === 'true' ||
    EXCLUDED_CLASS_NAMES.some(name => className.includes(name))
  );
}

function getSectionLabel(section, index) {
  if (section.id) return section.id;

  const className = section.className?.toString().trim().split(/\s+/)[0];
  return className || `section-${index + 1}`;
}

function getEligibleSections() {
  return Array.from(document.querySelectorAll('main section')).filter(
    section => !isExcludedSection(section)
  );
}

function createContext(path, section, index) {
  const sectionLabel = getSectionLabel(section, index);

  return {
    path,
    section: sectionLabel,
    key: `${path}#${sectionLabel}`,
  };
}

export function useLeadCaptureVisibility({ delayMs = DEFAULT_DELAY_MS } = {}) {
  const location = useLocation();
  const normalizedPath = normalizePath(location.pathname);
  const [visibleContext, setVisibleContext] = useState(null);
  const [currentContext, setCurrentContext] = useState(null);
  const [dismissedContextKey, setDismissedContextKey] = useState(getDismissedContextKey);
  const [mobileViewport, setMobileViewport] = useState(isMobileViewport);
  const isVisible =
    visibleContext?.path === normalizedPath && !isContactPath(location.pathname) && !mobileViewport;

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const onChange = event => {
      setMobileViewport(event.matches);
      if (event.matches) {
        setVisibleContext(current => (current ? null : current));
      }
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (isContactPath(location.pathname) || isSuppressedPermanently() || mobileViewport) return;

    let observer;
    let retryTimer;
    let attempts = 0;

    function setupObserver() {
      const sections = getEligibleSections();
      const visibleSections = new Map();

      if (!sections.length) {
        attempts += 1;
        if (attempts < SECTION_LOOKUP_MAX_ATTEMPTS) {
          retryTimer = setTimeout(setupObserver, SECTION_LOOKUP_RETRY_MS);
        }
        return;
      }

      observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.intersectionRatio >= MIN_VISIBLE_RATIO) {
              visibleSections.set(entry.target, entry.intersectionRatio);
            } else {
              visibleSections.delete(entry.target);
            }
          });

          const [section] =
            Array.from(visibleSections.entries()).sort((a, b) => b[1] - a[1])[0] || [];
          if (!section) {
            setCurrentContext(null);
            return;
          }

          const nextContext = createContext(normalizedPath, section, sections.indexOf(section));
          setCurrentContext(current => (current?.key === nextContext.key ? current : nextContext));
        },
        { threshold: [0, MIN_VISIBLE_RATIO, 0.35, 0.6] }
      );

      sections.forEach(section => observer.observe(section));
    }

    setupObserver();

    return () => {
      clearTimeout(retryTimer);
      observer?.disconnect();
    };
  }, [location.pathname, normalizedPath, mobileViewport]);

  useEffect(() => {
    if (!currentContext || isVisible || isSuppressedPermanently() || mobileViewport) return;
    if (currentContext.path !== normalizedPath) return;
    if (currentContext.key === dismissedContextKey) return;

    const timer = setTimeout(() => {
      trackEvent('lead_capture', {
        action: 'impression',
        page_path: currentContext.path,
        section: currentContext.section,
      });
      setVisibleContext(currentContext);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [currentContext, delayMs, dismissedContextKey, isVisible, normalizedPath, mobileViewport]);

  function dismiss({ neverShowAgain = false } = {}) {
    const dismissedContext = visibleContext || currentContext;

    if (neverShowAgain) {
      localStorage.setItem(NEVER_SHOW_LEAD_CAPTURE_KEY, '1');
      trackEvent('lead_capture', { action: 'never_show_again' });
    } else if (dismissedContext) {
      setDismissedContext(dismissedContext);
      setDismissedContextKey(dismissedContext.key);
      trackEvent('lead_capture', {
        action: 'dismiss',
        page_path: dismissedContext.path,
        section: dismissedContext.section,
      });
    } else {
      trackEvent('lead_capture', { action: 'dismiss' });
    }

    setVisibleContext(null);
  }

  return { visible: isVisible, dismiss };
}
