import { useState } from 'react';
import { EmailCaptureForm } from '@components/forms/EmailCaptureForm';
import { AssistantWidget } from './AssistantWidget';

export function WidgetManager() {
  const [emailVisible, setEmailVisible] = useState(false);

  return (
    <>
      <EmailCaptureForm onVisibilityChange={setEmailVisible} />
      <AssistantWidget emailVisible={emailVisible} />
    </>
  );
}
