export type AssistantActionType = 'book_meeting' | 'email_hello' | 'email_hr';

export interface AssistantAction {
  type: AssistantActionType;
}
