import type { ConversationTransformTask } from './conversationtransform.types.js';

export type QuestionIntent =
  | 'small_talk'
  | 'rag_question'
  | 'unsupported'
  | 'conversation_transform';

export type FallbackQuestionIntent = Exclude<QuestionIntent, 'rag_question' | 'conversation_transform'>;

export type QuestionPurpose =
  | 'general'
  | 'capability_evaluation'
  | 'explicit_contact_request'
  | 'declined_offer';

export interface IQuestionIntentResult {
  intent: QuestionIntent;
  purpose: QuestionPurpose;
  response: string;
  language: string;
  task?: ConversationTransformTask;
}
