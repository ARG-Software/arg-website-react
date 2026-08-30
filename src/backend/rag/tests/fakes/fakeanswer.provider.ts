import type { ILlmProvider } from '../../application/ports/iproviderports.js';
import type { IAssistantUiCopy } from '../../domain/assistant/assistantcopy.types.js';
import type {
  ConversationTransformTask,
} from '../../domain/conversation/conversationtransform.types.js';
import type {
  QuestionIntent,
} from '../../domain/conversation/questionintent.types.js';
import type {
  IRetrievalPlan,
} from '../../domain/routing/retrievalplan.types.js';

export interface IFakeAnswerProviderBehavior {
  intent?: QuestionIntent;
  intentResponse?: string;
  language?: string;
  plan?: Partial<IRetrievalPlan>;
  generatedAnswer?: string;
  insufficientContextAnswer?: string;
  intentFallbackResponse?: string;
  personClarificationAnswer?: string;
  rewrittenAnswer?: string;
  translatedUiCopy?: Partial<IAssistantUiCopy>;
  transformTask?: ConversationTransformTask;
  onClassifyIntent?: (question: string, pageContext: unknown) => void;
  onGenerateAnswer?: (question: string) => void;
  onGeneratePersonClarification?: (question: string, responseLanguage: string) => void;
  onRewritePreviousAnswer?: (
    instruction: string,
    previousAnswer: string,
    task: ConversationTransformTask
  ) => void;
  onTranslateAssistantUiCopy?: () => void;
}

export function createFakeAnswerProvider(
  planQuery: string,
  behavior: IFakeAnswerProviderBehavior = {}
): ILlmProvider {
  const {
    intent = 'rag_question',
    intentResponse = '',
    language = 'en',
    plan,
    generatedAnswer = 'Grounded answer.',
    insufficientContextAnswer = 'Please send us a message so we can help.',
    intentFallbackResponse = 'Please ask about our website.',
    personClarificationAnswer = 'Who do you mean? Please tell me the person name.',
    rewrittenAnswer = 'Rewritten answer.',
    translatedUiCopy = {},
    transformTask,
    onClassifyIntent,
    onGenerateAnswer,
    onGeneratePersonClarification,
    onRewritePreviousAnswer,
    onTranslateAssistantUiCopy,
  } = behavior;

  const retrievalPlan: IRetrievalPlan = {
    query: planQuery,
    mode: 'direct_evidence',
    entity: '',
    subject: '',
    ...plan,
  };

  return {
    async classifyQuestionIntent(question, _messages, pageContext) {
      onClassifyIntent?.(question, pageContext);
      return { intent, response: intentResponse, language, ...(transformTask ? { task: transformTask } : {}) };
    },
    async planRetrieval() {
      return retrievalPlan;
    },
    async generateAnswer(question) {
      onGenerateAnswer?.(question);
      return generatedAnswer;
    },
    async generateInsufficientContextAnswer() {
      return insufficientContextAnswer;
    },
    async generateIntentFallbackResponse() {
      return intentFallbackResponse;
    },
    async generatePersonClarification(question, responseLanguage) {
      onGeneratePersonClarification?.(question, responseLanguage);
      return personClarificationAnswer;
    },
    async rewritePreviousAnswer(instruction, previousAnswer, task) {
      onRewritePreviousAnswer?.(instruction, previousAnswer, task);
      return rewrittenAnswer;
    },
    async translateAssistantUiCopy() {
      onTranslateAssistantUiCopy?.();
      return translatedUiCopy;
    },
  };
}
