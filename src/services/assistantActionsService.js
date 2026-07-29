import assistantContent from '@data/assistant.json';
import {
  getMailtoLink,
  getProjectBookingLink,
  getProjectBriefFormLink,
} from '@services/linksService';

const ASSISTANT_ACTION_HREFS = {
  book_meeting: () => getProjectBookingLink(),
  contact_form: () => getProjectBriefFormLink(),
  email_hr: () => getMailtoLink('hr', 'Career enquiry'),
};

const ASSISTANT_ACTION_HANDLERS = {
  gaspar_message: triggerLeadCapture,
};

function triggerLeadCapture() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('gaspar:start-lead-capture', { detail: { skipOffer: true } })
    );
  }
}

export function getAssistantActionDetails(actionType) {
  const action = assistantContent.actions[actionType];

  if (!action) return null;

  const onClick = ASSISTANT_ACTION_HANDLERS[actionType];

  if (onClick) {
    return {
      label: action.label,
      href: null,
      external: false,
      onClick,
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
