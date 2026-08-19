import assistantContent from '@data/assistant.json';

export const LEAD_DISMISS_MODES = {
  SESSION: 'session',
  TWO_DAYS: 'expiry',
};

export function getPromptAction(prompt, copy = assistantContent) {
  if (prompt === copy.leadCaptureQuickPrompts[0]) return 'accept';
  if (prompt === copy.leadCaptureQuickPrompts[1]) return 'chat';
  return null;
}

export function getInputPlaceholder({
  isLeadActive,
  leadStep,
  LEAD_STEPS,
  copy = assistantContent,
}) {
  if (!isLeadActive) return copy.placeholders.question;
  if (leadStep === LEAD_STEPS.OFFER) return copy.placeholders.leadOffer;
  if (leadStep === LEAD_STEPS.EMAIL) return copy.placeholders.email;
  if (leadStep === LEAD_STEPS.MESSAGE) return copy.placeholders.message;
  if (leadStep === LEAD_STEPS.CONFIRM) return copy.placeholders.leadConfirm;
  if (leadStep === LEAD_STEPS.SUBMITTING) return copy.placeholders.leadSubmitting;
  if (leadStep === LEAD_STEPS.SUCCESS) return copy.placeholders.leadSuccess;
  return copy.placeholders.question;
}

export function getPanelStateForViewport(mobileViewport) {
  return mobileViewport ? 'fullscreen' : 'open';
}
