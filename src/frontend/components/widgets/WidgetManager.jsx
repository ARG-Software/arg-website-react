import { Suspense, useContext, useEffect, useRef, useState } from 'react';
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
import { useLocation } from 'react-router-dom';

const AssistantWidget = lazyWithRetry(() =>
  import('./AssistantWidget').then(module => ({ default: module.AssistantWidget }))
);

const AUTO_LEAD_CAPTURE_DELAY_MS = 10000;
const CONTACT_PATH = '/contact';
const TWO_DAY_DISMISS = 'expiry';

function normalizePath(pathname) {
  return pathname.replace(/\/+$/, '') || '/';
}

function isContactPath(pathname) {
  return normalizePath(pathname) === CONTACT_PATH;
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

function isLeadCaptureSuppressed() {
  try {
    const expiryData = JSON.parse(
      getStorageItem(window.localStorage, LEAD_CAPTURE_DISMISS_EXPIRY_KEY)
    );
    const dismissedWithExpiry =
      expiryData?.dismissedAt &&
      Date.now() - Number(expiryData.dismissedAt) < LEAD_CAPTURE_DISMISS_EXPIRY_MS;

    return Boolean(
      getStorageItem(window.localStorage, ALREADY_SUBSCRIBED_KEY) ||
      getStorageItem(window.sessionStorage, LEAD_CAPTURE_SESSION_DISMISSED_KEY) ||
      dismissedWithExpiry
    );
  } catch {
    return false;
  }
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

export function WidgetManager() {
  const location = useLocation();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [shouldLoadAssistant, setShouldLoadAssistant] = useState(false);
  const [reopenRequest, setReopenRequest] = useState(0);
  const [pendingLeadCaptureOpen, setPendingLeadCaptureOpen] = useState(false);
  const assistantWasOpenRef = useRef(false);
  const autoOfferDoneRef = useRef(false);
  const loadingDone = useContext(LoadingContext);
  const normalizedPath = normalizePath(location.pathname);
  const renderAssistant = shouldLoadAssistant || pendingLeadCaptureOpen;

  useEffect(() => {
    if (!loadingDone || shouldLoadAssistant) return undefined;

    const timer = window.setTimeout(() => setShouldLoadAssistant(true), 0);
    return () => window.clearTimeout(timer);
  }, [loadingDone, shouldLoadAssistant]);

  useEffect(() => {
    if (
      !loadingDone ||
      assistantOpen ||
      autoOfferDoneRef.current ||
      isContactPath(location.pathname) ||
      isLeadCaptureSuppressed()
    ) {
      return undefined;
    }

    let idleTimer;

    function showLeadCapture() {
      if (autoOfferDoneRef.current || isLeadCaptureSuppressed()) return;

      autoOfferDoneRef.current = true;
      trackEvent('assistant_lead_capture', {
        action: 'offer_shown',
        page_path: normalizedPath,
        source: 'idle_timer',
      });
      setShouldLoadAssistant(true);
      setPendingLeadCaptureOpen(true);
    }

    function resetIdleTimer() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(showLeadCapture, AUTO_LEAD_CAPTURE_DELAY_MS);
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
  }, [assistantOpen, loadingDone, location.pathname, normalizedPath]);

  function handleTriggerOpen() {
    setShouldLoadAssistant(true);
    setReopenRequest(request => request + 1);
  }

  function handleLeadCaptureDismiss(options) {
    autoOfferDoneRef.current = true;
    if (options?.mode === TWO_DAY_DISMISS) {
      setStorageItem(
        window.localStorage,
        LEAD_CAPTURE_DISMISS_EXPIRY_KEY,
        JSON.stringify({ dismissedAt: Date.now() })
      );
    } else {
      setStorageItem(window.sessionStorage, LEAD_CAPTURE_SESSION_DISMISSED_KEY, '1');
    }

    trackEvent('assistant_lead_capture', {
      action: 'dismissed',
      dismissal_scope: options?.mode === TWO_DAY_DISMISS ? 'two_days' : 'session',
      page_path: normalizedPath,
      source: 'idle_timer',
    });

    if (options?.reopenAsChat && assistantOpen) {
      assistantWasOpenRef.current = true;
    }
  }

  function handleAssistantOpenChange(isOpen) {
    if (!isOpen && assistantOpen) {
      autoOfferDoneRef.current = true;
    }

    setAssistantOpen(isOpen);

    if (isOpen) {
      setPendingLeadCaptureOpen(false);
    }

    if (!isOpen && assistantWasOpenRef.current) {
      assistantWasOpenRef.current = false;
      setReopenRequest(request => request + 1);
    }
  }

  if (!renderAssistant) {
    return <AssistantTrigger onOpen={handleTriggerOpen} />;
  }

  return (
    <Suspense fallback={<AssistantTrigger onOpen={handleTriggerOpen} />}>
      <AssistantWidget
        onOpenChange={handleAssistantOpenChange}
        reopenRequest={reopenRequest}
        leadCaptureVisible={pendingLeadCaptureOpen}
        onLeadCaptureDismiss={handleLeadCaptureDismiss}
      />
    </Suspense>
  );
}
