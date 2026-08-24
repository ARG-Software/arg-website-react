import type { ConversationTransformTask } from './ConversationTransform.js';

export type QuestionIntent =
  | 'small_talk'
  | 'rag_question'
  | 'unsupported'
  | 'conversation_transform';

export type FallbackQuestionIntent = Exclude<QuestionIntent, 'rag_question' | 'conversation_transform'>;

export interface IQuestionIntentResult {
  intent: QuestionIntent;
  response: string;
  language: string;
  task?: ConversationTransformTask;
}
