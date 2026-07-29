import type { AssistantAction } from '../../core/types/actions.js';

const PROJECT_CONTACT_QUESTION_PATTERN =
  /\b(?:book|meeting|call|contact|email|reach|talk|speak|discuss|project|service|services|brief|scope|proposal|quote|estimate|budget|pricing|cost|collaborat(?:e|ion)|get started)\b/i;
const HIRE_ARG_QUESTION_PATTERN =
  /\b(?:hire|engage|work with)\b.{0,40}\b(?:arg|you|you guys|your team|your studio)\b|\b(?:arg|you|you guys|your team|your studio)\b.{0,40}\b(?:for hire|hire|engage)\b/i;
const CAREERS_QUESTION_PATTERN = /\b(?:career|careers|job|jobs|hiring|hire|apply|application|role|position)\b/i;
const PROJECT_CONTACT_ACTIONS: AssistantAction[] = [
  { type: 'book_meeting' },
  { type: 'gaspar_message' },
  { type: 'contact_form' },
];
const CONTACT_ACTIONS: AssistantAction[] = [{ type: 'gaspar_message' }, { type: 'contact_form' }];

export function createAssistantActions(question: string): AssistantAction[] {
  if (HIRE_ARG_QUESTION_PATTERN.test(question)) {
    return PROJECT_CONTACT_ACTIONS;
  }

  if (CAREERS_QUESTION_PATTERN.test(question)) {
    return [{ type: 'email_hr' }];
  }

  if (PROJECT_CONTACT_QUESTION_PATTERN.test(question)) {
    return PROJECT_CONTACT_ACTIONS;
  }

  return [];
}

export function createInsufficientContextActions(question: string): AssistantAction[] {
  const actions = createAssistantActions(question);

  return actions.length > 0 ? actions : CONTACT_ACTIONS;
}
