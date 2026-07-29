import assistantContent from '@data/assistant.json';

export const LEAD_SOURCE = 'lead_capture';
export const CHAT_SOURCE = 'chat';

export function getLeadAssistantMessage(content, extra = {}) {
  return { role: 'assistant', content, source: LEAD_SOURCE, ...extra };
}

export function getLeadUserMessage(content) {
  return { role: 'user', content, source: LEAD_SOURCE };
}

export function getLeadConfirmMessage(email, message) {
  return getLeadAssistantMessage(`Send this to ARG?\nEmail: ${email}\nMessage: ${message}`, {
    showConfirmButtons: true,
  });
}

export function disableLeadConfirmButtons(messages) {
  return messages.map(message =>
    message.showConfirmButtons ? { ...message, showConfirmButtons: false } : message
  );
}

export function getLeadMessagesForResult(prevMessages, result, context = {}) {
  const copy = assistantContent.messages;
  const userContent = context.userContent;
  const userMessage = getLeadUserMessage(userContent);

  switch (result.type) {
    case 'accepted':
      return [...prevMessages, userMessage, getLeadAssistantMessage(copy.leadCaptureEmail)];
    case 'declined':
      return [...prevMessages, userMessage, getLeadAssistantMessage(copy.leadCaptureDeclined)];
    case 'email_captured':
      return [...prevMessages, userMessage, getLeadAssistantMessage(copy.leadCaptureMessagePrompt)];
    case 'lead_captured':
      return [...prevMessages, userMessage, getLeadConfirmMessage(result.email, result.message)];
    case 'multiple_emails':
      return [
        ...prevMessages,
        userMessage,
        getLeadAssistantMessage(result.message || copy.multipleEmails),
      ];
    case 'no_email_found':
      return [
        ...prevMessages,
        userMessage,
        getLeadAssistantMessage(result.message || context.leadError || copy.noEmailFound),
      ];
    case 'message_skipped':
      return [
        ...prevMessages,
        getLeadUserMessage('skip'),
        getLeadConfirmMessage(context.capturedEmail, copy.noMessageAdded),
      ];
    case 'message_captured':
      return [
        ...prevMessages,
        userMessage,
        getLeadConfirmMessage(context.capturedEmail, result.message),
      ];
    case 'cancelled':
      return [...prevMessages, userMessage, getLeadAssistantMessage(copy.leadCaptureCancelled)];
    case 'submitting':
      return [
        ...prevMessages,
        getLeadUserMessage('send'),
        getLeadAssistantMessage(copy.sending, { isLoading: true }),
      ];
    case 'editing':
      return [
        ...disableLeadConfirmButtons(prevMessages),
        getLeadUserMessage('edit'),
        getLeadAssistantMessage(copy.leadCaptureEdit),
      ];
    case 'empty':
      return [
        ...prevMessages,
        getLeadUserMessage('(empty)'),
        getLeadAssistantMessage(copy.emptyResponse),
      ];
    case 'unclear':
      return [...prevMessages, userMessage, getLeadAssistantMessage(copy.leadCaptureUnclear)];
    default:
      return prevMessages;
  }
}
