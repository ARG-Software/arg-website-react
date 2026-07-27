import { useRef, useState } from 'react';
import { useLeadCaptureVisibility } from '@hooks/useLeadCaptureVisibility';
import { AssistantWidget } from './AssistantWidget';

export function WidgetManager() {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [reopenRequest, setReopenRequest] = useState(0);
  const assistantWasOpenRef = useRef(false);
  const leadCapture = useLeadCaptureVisibility();

  function handleLeadCaptureDismiss() {
    leadCapture.dismiss();
    if (assistantOpen) {
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
