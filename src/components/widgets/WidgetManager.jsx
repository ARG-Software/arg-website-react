import { useContext, useRef, useState } from 'react';
import { useLeadCaptureVisibility } from '@hooks/useLeadCaptureVisibility';
import { LoadingContext } from '@providers/LoadingProvider';
import { AssistantWidget } from './AssistantWidget';

export function WidgetManager() {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [reopenRequest, setReopenRequest] = useState(0);
  const assistantWasOpenRef = useRef(false);
  const loadingDone = useContext(LoadingContext);
  const leadCapture = useLeadCaptureVisibility({ isSuppressed: !loadingDone });

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

  return (
    <>
      <AssistantWidget
        onOpenChange={handleAssistantOpenChange}
        reopenRequest={reopenRequest}
        leadCaptureVisible={leadCapture.visible}
        onLeadCaptureDismiss={handleLeadCaptureDismiss}
      />
    </>
  );
}
