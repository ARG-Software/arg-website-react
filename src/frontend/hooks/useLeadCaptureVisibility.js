import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ALREADY_SUBSCRIBED_KEY,
  LEAD_CAPTURE_DISMISS_EXPIRY_KEY,
  LEAD_CAPTURE_DISMISS_EXPIRY_MS,
  LEAD_CAPTURE_SESSION_DISMISSED_KEY,
} from '@constants/ui';
import { trackEvent } from '@services/analytics';

const DEFAULT_IDLE_DELAY_MS = 10000;
const CONTACT_PATH = '/contact';
const TWO_DAY_DISMISS = 'expiry';
const SESSION_DISMISS = 'session';

function normalizePath(pathname) {
  return pathname.replace(/\/+$/, '') || '/';
}

function isContactPath(pathname) {
  return normalizePath(pathname) === CONTACT_PATH;
}

function getClientStorage(name) {
  if (typeof window === 'undefined') return null;
  return window[name];
}

function getStorageItem(storage, key) {
  try {
    return storage?.getItem(key) || null;
  } catch {
    return null;
  }
}

function setStorageItem(storage, key, value) {
  try {
    storage?.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

function isDismissedWithExpiry() {
  try {
    const data = JSON.parse(
      getStorageItem(getClientStorage('localStorage'), LEAD_CAPTURE_DISMISS_EXPIRY_KEY)
    );

    if (!data?.dismissedAt) return false;

    return Date.now() - Number(data.dismissedAt) < LEAD_CAPTURE_DISMISS_EXPIRY_MS;
  } catch {
    return false;
  }
}

function isLeadCaptureSuppressed() {
  return Boolean(
    getStorageItem(getClientStorage('localStorage'), ALREADY_SUBSCRIBED_KEY) ||
    getStorageItem(getClientStorage('sessionStorage'), LEAD_CAPTURE_SESSION_DISMISSED_KEY) ||
    isDismissedWithExpiry()
  );
}

export function useLeadCaptureVisibility({
  delayMs = DEFAULT_IDLE_DELAY_MS,
  isSuppressed = false,
} = {}) {
  const location = useLocation();
  const normalizedPath = normalizePath(location.pathname);
  const [visiblePath, setVisiblePath] = useState(null);
  const [inMemoryDismissed, setInMemoryDismissed] = useState(false);
  const visible =
    visiblePath === normalizedPath &&
    !isContactPath(location.pathname) &&
    !isSuppressed &&
    !inMemoryDismissed &&
    !isLeadCaptureSuppressed();

  useEffect(() => {
    if (
      isContactPath(location.pathname) ||
      isLeadCaptureSuppressed() ||
      isSuppressed ||
      inMemoryDismissed
    )
      return;

    let idleTimer;
    let hasShown = false;

    function showLeadCapture() {
      if (hasShown || isLeadCaptureSuppressed() || isSuppressed || inMemoryDismissed) return;

      hasShown = true;
      trackEvent('assistant_lead_capture', {
        action: 'offer_shown',
        page_path: normalizedPath,
        source: 'idle_timer',
      });
      setVisiblePath(normalizedPath);
    }

    function resetIdleTimer() {
      if (hasShown) return;
      clearTimeout(idleTimer);
      idleTimer = setTimeout(showLeadCapture, delayMs);
    }

    resetIdleTimer();
    window.addEventListener('scroll', resetIdleTimer, { passive: true });
    window.addEventListener('wheel', resetIdleTimer, { passive: true });
    window.addEventListener('touchmove', resetIdleTimer, { passive: true });

    return () => {
      clearTimeout(idleTimer);
      window.removeEventListener('scroll', resetIdleTimer);
      window.removeEventListener('wheel', resetIdleTimer);
      window.removeEventListener('touchmove', resetIdleTimer);
    };
  }, [delayMs, inMemoryDismissed, isSuppressed, location.pathname, normalizedPath]);

  function dismiss(mode = SESSION_DISMISS) {
    if (mode === TWO_DAY_DISMISS) {
      setStorageItem(
        getClientStorage('localStorage'),
        LEAD_CAPTURE_DISMISS_EXPIRY_KEY,
        JSON.stringify({ dismissedAt: Date.now() })
      );
    } else {
      setStorageItem(getClientStorage('sessionStorage'), LEAD_CAPTURE_SESSION_DISMISSED_KEY, '1');
    }

    trackEvent('assistant_lead_capture', {
      action: 'dismissed',
      dismissal_scope: mode === TWO_DAY_DISMISS ? 'two_days' : 'session',
      page_path: normalizedPath,
      source: 'idle_timer',
    });
    setVisiblePath(null);
    setInMemoryDismissed(true);
  }

  return { visible, dismiss };
}
