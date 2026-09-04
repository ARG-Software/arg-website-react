import { Suspense, useContext, useEffect, useRef, useState } from 'react';
import assistantContent from '@data/assistant.json';
import { useLeadCaptureVisibility } from '@hooks/useLeadCaptureVisibility';
import { LoadingContext } from '@providers/LoadingProvider';
import { lazyWithRetry } from '@utils/lazyWithRetry';

const AssistantWidget = lazyWithRetry(() =>
  import('./AssistantWidget').then(module => ({ default: module.AssistantWidget }))
);

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
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [shouldLoadAssistant, setShouldLoadAssistant] = useState(false);
  const [reopenRequest, setReopenRequest] = useState(0);
  const [leadCaptureRequest, setLeadCaptureRequest] = useState(0);
  const assistantWasOpenRef = useRef(false);
  const leadCaptureRequestedRef = useRef(false);
  const loadingDone = useContext(LoadingContext);
  const leadCapture = useLeadCaptureVisibility({ isSuppressed: !loadingDone });
  const renderAssistant = shouldLoadAssistant || leadCapture.visible;

  useEffect(() => {
    if (!leadCapture.visible) {
      leadCaptureRequestedRef.current = false;
      return undefined;
    }

    if (leadCaptureRequestedRef.current) return undefined;

    leadCaptureRequestedRef.current = true;
    const frame = requestAnimationFrame(() => {
      setShouldLoadAssistant(true);
      setLeadCaptureRequest(request => request + 1);
    });

    return () => cancelAnimationFrame(frame);
  }, [leadCapture.visible]);

  function handleTriggerOpen() {
    setShouldLoadAssistant(true);
    setReopenRequest(request => request + 1);
  }

  function handleLeadCaptureDismiss(options) {
    leadCapture.dismiss(options?.mode);
    if (options?.reopenAsChat && assistantOpen) {
      assistantWasOpenRef.current = true;
    }
  }

  function handleAssistantOpenChange(isOpen) {
    setAssistantOpen(isOpen);

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
        leadCaptureRequest={leadCaptureRequest}
        leadCaptureVisible={leadCapture.visible}
        onLeadCaptureDismiss={handleLeadCaptureDismiss}
      />
    </Suspense>
  );
}
