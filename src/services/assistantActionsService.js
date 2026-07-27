import assistantContent from '@data/assistant.json';
import { getMailtoLink, getProjectBookingLink } from '@services/linksService';

const ASSISTANT_ACTION_HREFS = {
  book_meeting: () => getProjectBookingLink(),
  email_hr: () => getMailtoLink('hr', 'Career enquiry'),
};

function triggerLeadCapture() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gaspar:start-lead-capture'));
  }
}

export function getAssistantActionDetails(actionType) {
  const action = assistantContent.actions[actionType];

  if (!action) return null;

  if (actionType === 'email_hello') {
    return {
      label: action.label,
      href: null,
      external: false,
      onClick: triggerLeadCapture,
    };
  }

  const getHref = ASSISTANT_ACTION_HREFS[actionType];

  if (!getHref) return null;

  return {
    label: action.label,
    href: getHref(),
    external: action.external,
  };
}
