import { useRef, useState } from 'react';
import { EmailCaptureForm } from '@components/forms/EmailCaptureForm';
import { AssistantWidget } from './AssistantWidget';

export function WidgetManager() {
  const [emailVisible, setEmailVisible] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [reopenRequest, setReopenRequest] = useState(0);
  const assistantWasOpenRef = useRef(false);

  function handleEmailVisibilityChange(visible) {
    if (visible && !emailVisible) {
      assistantWasOpenRef.current = assistantOpen;
    } else if (assistantWasOpenRef.current) {
      assistantWasOpenRef.current = false;
      setReopenRequest(request => request + 1);
    }

    setEmailVisible(visible);
  }

  return (
    <>
      <EmailCaptureForm onVisibilityChange={handleEmailVisibilityChange} />
      <AssistantWidget
        isSuppressed={emailVisible}
        onOpenChange={setAssistantOpen}
        reopenRequest={reopenRequest}
      />
    </>
  );
}
