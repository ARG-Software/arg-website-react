import { Suspense, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import assistantContent from '@data/assistant.json';
import {
  ALREADY_SUBSCRIBED_KEY,
  LEAD_CAPTURE_DISMISS_EXPIRY_KEY,
  LEAD_CAPTURE_DISMISS_EXPIRY_MS,
  LEAD_CAPTURE_SESSION_DISMISSED_KEY,
} from '@constants/ui';
import { LoadingContext } from '@providers/LoadingProvider';
import { trackCTA } from '@services/analytics';
import { lazyWithRetry } from '@utils/lazyWithRetry';
import { AssistantNudge } from '@components/widgets/AssistantNudge';

const AssistantWidget = lazyWithRetry(() =>
  import('@components/widgets/AssistantWidget').then(module => ({
    default: module.AssistantWidget,
  }))
);

const DEFAULT_IDLE_DELAY_MS = 10000;
const CONTACT_PATH = '/contact';
const NUDGE_SOURCE = 'gaspar_nudge';

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
  const loadingDone = useContext(LoadingContext);
  const nudgeVisible =
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

    function showNudge() {
      if (hasShown || isLeadCaptureSuppressed() || inMemoryDismissed) return;

      hasShown = true;
      setVisiblePath(normalizedPath);
    }

    function resetIdleTimer() {
      if (hasShown) return;
      clearTimeout(idleTimer);
      idleTimer = setTimeout(showNudge, idleDelayMs);
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

  // Talking or booking hides the bubble for this visit; the close button hides it for two days
  function hideNudge(storageName, key, value) {
    setStorageItem(getClientStorage(storageName), key, value);
    setVisiblePath(null);
    setInMemoryDismissed(true);
  }

  function handleNudgeChat() {
    hideNudge('sessionStorage', LEAD_CAPTURE_SESSION_DISMISSED_KEY, '1');
    handleTriggerOpen();
  }

  function handleNudgeMeeting() {
    trackCTA('book_meeting', NUDGE_SOURCE);
    hideNudge('sessionStorage', LEAD_CAPTURE_SESSION_DISMISSED_KEY, '1');
  }

  function handleNudgeClose() {
    hideNudge(
      'localStorage',
      LEAD_CAPTURE_DISMISS_EXPIRY_KEY,
      JSON.stringify({ dismissedAt: Date.now() })
    );
  }

  function handleTriggerOpen() {
    setShouldLoadAssistant(true);
    setReopenRequest(request => request + 1);
  }

  const nudge = nudgeVisible ? (
    <AssistantNudge
      onChat={handleNudgeChat}
      onMeeting={handleNudgeMeeting}
      onClose={handleNudgeClose}
    />
  ) : null;

  if (!shouldLoadAssistant) {
    return (
      <>
        {nudge}
        <AssistantTrigger onOpen={handleTriggerOpen} />
      </>
    );
  }

  return (
    <>
      {nudge}
      <Suspense fallback={<AssistantTrigger onOpen={handleTriggerOpen} />}>
        <AssistantWidget onOpenChange={setAssistantOpen} reopenRequest={reopenRequest} />
      </Suspense>
    </>
  );
}
