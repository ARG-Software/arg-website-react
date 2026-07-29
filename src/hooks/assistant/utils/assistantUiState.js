import assistantContent from '@data/assistant.json';

export const LEAD_DISMISS_MODES = {
  SESSION: 'session',
  TWO_DAYS: 'expiry',
};

export function getPromptAction(prompt) {
  if (prompt === assistantContent.leadCaptureQuickPrompts[0]) return 'accept';
  if (prompt === assistantContent.leadCaptureQuickPrompts[1]) return 'chat';
  return null;
}

export function getInputPlaceholder({ isLeadActive, leadStep, LEAD_STEPS }) {
  if (!isLeadActive) return assistantContent.placeholders.question;
  if (leadStep === LEAD_STEPS.OFFER) return assistantContent.placeholders.leadOffer;
  if (leadStep === LEAD_STEPS.EMAIL) return assistantContent.placeholders.email;
  if (leadStep === LEAD_STEPS.MESSAGE) return assistantContent.placeholders.message;
  if (leadStep === LEAD_STEPS.CONFIRM) return assistantContent.placeholders.leadConfirm;
  if (leadStep === LEAD_STEPS.SUBMITTING) return assistantContent.placeholders.leadSubmitting;
  if (leadStep === LEAD_STEPS.SUCCESS) return assistantContent.placeholders.leadSuccess;
  return assistantContent.placeholders.question;
}

export function getPanelStateForViewport(mobileViewport) {
  return mobileViewport ? 'fullscreen' : 'open';
}
