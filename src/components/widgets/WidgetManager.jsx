import { useState } from 'react';
import { EmailCaptureForm } from '@components/forms/EmailCaptureForm';
import { AssistantWidget } from './AssistantWidget';

export function WidgetManager() {
  const [emailVisible, setEmailVisible] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  return (
    <>
      <EmailCaptureForm isSuppressed={assistantOpen} onVisibilityChange={setEmailVisible} />
      <AssistantWidget isSuppressed={emailVisible} onOpenChange={setAssistantOpen} />
    </>
  );
}
