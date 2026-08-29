import assistantContent from '@data/assistant.json';

export const LEAD_SOURCE = 'lead_capture';
export const CHAT_SOURCE = 'chat';
export const RATE_LIMIT_SOURCE = 'rate_limit_notice';

export function getLeadAssistantMessage(content, extra = {}) {
  return { role: 'assistant', content, source: LEAD_SOURCE, ...extra };
}

export function getLeadUserMessage(content) {
  return { role: 'user', content, source: LEAD_SOURCE };
}

export function getRateLimitAssistantMessage(content) {
  return { role: 'assistant', content, source: RATE_LIMIT_SOURCE };
}

export function getLeadConfirmMessage(email, message, copy = assistantContent) {
  const labels = copy.leadConfirm;

  return getLeadAssistantMessage(
    `${labels.title}\n${labels.emailLabel}: ${email}\n${labels.messageLabel}: ${message}`,
    {
      showConfirmButtons: true,
    }
  );
}

export function disableLeadConfirmButtons(messages) {
  return messages.map(message =>
    message.showConfirmButtons ? { ...message, showConfirmButtons: false } : message
  );
}

export function getLeadMessagesForResult(prevMessages, result, context = {}) {
  const assistantCopy = context.copy || assistantContent;
  const copy = assistantCopy.messages;
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
      return [
        ...prevMessages,
        userMessage,
        getLeadConfirmMessage(result.email, result.message, assistantCopy),
      ];
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
        getLeadUserMessage(assistantCopy.labels.skip),
        getLeadConfirmMessage(context.capturedEmail, copy.noMessageAdded, assistantCopy),
      ];
    case 'message_captured':
      return [
        ...prevMessages,
        userMessage,
        getLeadConfirmMessage(context.capturedEmail, result.message, assistantCopy),
      ];
    case 'cancelled':
      return [...prevMessages, userMessage, getLeadAssistantMessage(copy.leadCaptureCancelled)];
    case 'submitting':
      return [
        ...prevMessages,
        getLeadUserMessage(assistantCopy.labels.send),
        getLeadAssistantMessage(copy.sending, { isLoading: true }),
      ];
    case 'editing':
      return [
        ...disableLeadConfirmButtons(prevMessages),
        getLeadUserMessage(assistantCopy.labels.edit),
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
