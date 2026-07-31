import type { AnswerProvider } from '../../domain/providers/ProviderPorts.js';
import type {
  ConversationTransformTask,
} from '../../domain/conversation/ConversationTransform.js';
import type {
  QuestionIntent,
} from '../../domain/conversation/QuestionIntent.js';
import type {
  RetrievalPlan,
} from '../../domain/retrieval/RetrievalPlan.js';

export interface FakeAnswerProviderBehavior {
  intent?: QuestionIntent;
  intentResponse?: string;
  language?: string;
  plan?: Partial<RetrievalPlan>;
  generatedAnswer?: string;
  insufficientContextAnswer?: string;
  intentFallbackResponse?: string;
  rewrittenAnswer?: string;
  transformTask?: ConversationTransformTask;
  onClassifyIntent?: (question: string, pageContext: unknown) => void;
  onGenerateAnswer?: (question: string) => void;
  onRewritePreviousAnswer?: (
    instruction: string,
    previousAnswer: string,
    task: ConversationTransformTask
  ) => void;
}

export function createFakeAnswerProvider(
  planQuery: string,
  behavior: FakeAnswerProviderBehavior = {}
): AnswerProvider {
  const {
    intent = 'rag_question',
    intentResponse = '',
    language = 'en',
    plan,
    generatedAnswer = 'Grounded answer.',
    insufficientContextAnswer = 'Please send us a message so we can help.',
    intentFallbackResponse = 'Please ask about our website.',
    rewrittenAnswer = 'Rewritten answer.',
    transformTask,
    onClassifyIntent,
    onGenerateAnswer,
    onRewritePreviousAnswer,
  } = behavior;

  const retrievalPlan: RetrievalPlan = {
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
    async rewritePreviousAnswer(instruction, previousAnswer, task) {
      onRewritePreviousAnswer?.(instruction, previousAnswer, task);
      return rewrittenAnswer;
    },
  };
}
