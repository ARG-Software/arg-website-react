export type AssistantActionType = 'book_meeting' | 'gaspar_message' | 'contact_form' | 'email_hr';

export interface AssistantAction {
  type: AssistantActionType;
  autoStart?: boolean;
}
