import { Suspense, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import assistantContent from '@data/assistant.json';
import {
  ALREADY_SUBSCRIBED_KEY,
  LEAD_CAPTURE_DISMISS_EXPIRY_KEY,
  LEAD_CAPTURE_DISMISS_EXPIRY_MS,
  LEAD_CAPTURE_SESSION_DISMISSED_KEY,
} from '@constants/ui';
import { LoadingContext } from '@providers/LoadingProvider';
import { trackEvent } from '@services/analytics';
import { lazyWithRetry } from '@utils/lazyWithRetry';

const AssistantWidget = lazyWithRetry(() =>
  import('@components/widgets/AssistantWidget').then(module => ({
    default: module.AssistantWidget,
  }))
);

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

function AssistantTrigger({ onOpen }) {
  return (
    <button className="aw-trigger" onClick={onOpen} aria-label="Open assistant" type="button">
      <span className="aw-trigger__icon">
        <img src={assistantContent.imageSrc} alt="" />
      </span>
    </button>
  );
}

export function AssistantProvider({ idleDelayMs = DEFAULT_IDLE_DELAY_MS }) {
  const location = useLocation();
  const normalizedPath = normalizePath(location.pathname);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [shouldLoadAssistant, setShouldLoadAssistant] = useState(false);
  const [reopenRequest, setReopenRequest] = useState(0);
  const [visiblePath, setVisiblePath] = useState(null);
  const [inMemoryDismissed, setInMemoryDismissed] = useState(false);
  const assistantWasOpenRef = useRef(false);
  const loadingDone = useContext(LoadingContext);
  const leadCaptureVisible =
    visiblePath === normalizedPath &&
    !assistantOpen &&
    !isContactPath(location.pathname) &&
    !inMemoryDismissed &&
    !isLeadCaptureSuppressed();

  useEffect(() => {
    if (
      !loadingDone ||
      assistantOpen ||
      isContactPath(location.pathname) ||
      isLeadCaptureSuppressed() ||
      inMemoryDismissed
    ) {
      return undefined;
    }

    let idleTimer;
    let hasShown = false;

    function showLeadCapture() {
      if (hasShown || isLeadCaptureSuppressed() || inMemoryDismissed) return;

      hasShown = true;
      trackEvent('assistant_lead_capture', {
        action: 'offer_shown',
        page_path: normalizedPath,
        source: 'idle_timer',
      });
      setShouldLoadAssistant(true);
      setVisiblePath(normalizedPath);
    }

    function resetIdleTimer() {
      if (hasShown) return;
      clearTimeout(idleTimer);
      idleTimer = setTimeout(showLeadCapture, idleDelayMs);
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
  }, [
    assistantOpen,
    idleDelayMs,
    inMemoryDismissed,
    loadingDone,
    location.pathname,
    normalizedPath,
  ]);

  function handleLeadCaptureDismiss(options) {
    const mode = options?.mode || SESSION_DISMISS;

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

    if (options?.reopenAsChat && assistantOpen) {
      assistantWasOpenRef.current = true;
    }
  }

  function handleTriggerOpen() {
    setShouldLoadAssistant(true);
    setReopenRequest(request => request + 1);
  }

  function handleAssistantOpenChange(isOpen) {
    setAssistantOpen(isOpen);

    if (!isOpen && assistantWasOpenRef.current) {
      assistantWasOpenRef.current = false;
      setReopenRequest(request => request + 1);
    }
  }

  if (!shouldLoadAssistant && !leadCaptureVisible) {
    return <AssistantTrigger onOpen={handleTriggerOpen} />;
  }

  return (
    <Suspense fallback={<AssistantTrigger onOpen={handleTriggerOpen} />}>
      <AssistantWidget
        onOpenChange={handleAssistantOpenChange}
        reopenRequest={reopenRequest}
        leadCaptureVisible={leadCaptureVisible}
        onLeadCaptureDismiss={handleLeadCaptureDismiss}
      />
    </Suspense>
  );
}
