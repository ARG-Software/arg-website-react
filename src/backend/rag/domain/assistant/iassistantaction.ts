export type AssistantActionType = 'book_meeting' | 'gaspar_message' | 'contact_form' | 'email_hr';

export interface IAssistantAction {
  type: AssistantActionType;
  autoStart?: boolean;
}
