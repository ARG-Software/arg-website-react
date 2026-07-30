import type { AssistantAction } from '../../core/types/actions.js';

const PROJECT_CONTACT_QUESTION_PATTERN =
  /\b(?:book|meeting|call|contact|email|reach|talk|speak|discuss|project|service|services|brief|scope|proposal|quote|estimate|budget|pricing|cost|collaborat(?:e|ion)|get started)\b/i;
const CONTACT_OPTIONS_QUESTION_PATTERN =
  /\b(?:how|where|what)\b.{0,50}\b(?:contact|email|e-mail|reach|get in touch)\b|\b(?:contact options?|email address)\b|\b(?:contact|email|e-mail|reach|get in touch)\b.{0,50}\b(?:you|your team|arg|arg software)\b/i;
const GASPAR_MESSAGE_REQUEST_PATTERN =
  /\b(?:can|could|may|do)\s+i\s+(?:send|submit|leave)\s+(?:a\s+)?message\s+(?:through|via|to)\s+(?:you|gaspar|here)\b|\bi\s+(?:want|would like|need)\s+to\s+(?:send|submit|leave)\s+(?:you|gaspar)\s+(?:a\s+)?message\b|\b(?:send|submit|leave)\s+(?:you|gaspar)\s+(?:a\s+)?message\b|\b(?:can|could|do)\s+i\s+(?:do|send|submit|leave)\s+it\s+(?:through|via)\s+(?:you|gaspar)\b|\b(?:can|could)\s+you\s+(?:pass|forward|send)\s+(?:a\s+)?message\s+to\s+(?:arg|arg software|your team|the team|arg team|the arg team)\b/i;
const HIRE_ARG_QUESTION_PATTERN =
  /\b(?:hire|engage|work with)\b.{0,40}\b(?:arg|you|you guys|your team|your studio)\b|\b(?:arg|you|you guys|your team|your studio)\b.{0,40}\b(?:for hire|hire|engage)\b/i;
const CAREERS_QUESTION_PATTERN = /\b(?:career|careers|job|jobs|hiring|hire|apply|application|role|position|hr)\b/i;
const PROJECT_CONTACT_ACTIONS: AssistantAction[] = [
  { type: 'book_meeting' },
  { type: 'gaspar_message' },
  { type: 'contact_form' },
];
const CONTACT_OPTIONS_ACTIONS: AssistantAction[] = [
  { type: 'gaspar_message' },
  { type: 'book_meeting' },
  { type: 'contact_form' },
];
const GASPAR_MESSAGE_ACTIONS: AssistantAction[] = [{ type: 'gaspar_message', autoStart: true }];
const CONTACT_ACTIONS: AssistantAction[] = [{ type: 'gaspar_message' }, { type: 'contact_form' }];

export function createAssistantActions(question: string): AssistantAction[] {
  if (GASPAR_MESSAGE_REQUEST_PATTERN.test(question)) {
    return GASPAR_MESSAGE_ACTIONS;
  }

  if (HIRE_ARG_QUESTION_PATTERN.test(question)) {
    return PROJECT_CONTACT_ACTIONS;
  }

  if (CAREERS_QUESTION_PATTERN.test(question)) {
    return [{ type: 'email_hr' }];
  }

  if (CONTACT_OPTIONS_QUESTION_PATTERN.test(question)) {
    return CONTACT_OPTIONS_ACTIONS;
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
