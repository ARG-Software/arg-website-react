import assistantContent from '@data/assistant.json';
import { getMailtoLink, getProjectBookingLink } from '@services/linksservice';

const ASSISTANT_ACTION_HREFS = {
  book_meeting: () => getProjectBookingLink(),
  email_hello: () => getMailtoLink('hello', 'Project enquiry'),
  email_hr: () => getMailtoLink('hr', 'Career enquiry'),
};

export function getAssistantActionDetails(actionType) {
  const action = assistantContent.actions[actionType];
  const getHref = ASSISTANT_ACTION_HREFS[actionType];

  if (!action || !getHref) return null;

  return {
    label: action.label,
    href: getHref(),
    external: action.external,
  };
}
