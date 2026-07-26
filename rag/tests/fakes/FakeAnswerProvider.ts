import type { AnswerProvider } from '../../core/types/providers.js';
import type { QuestionIntent, RetrievalPlan } from '../../core/types/retrieval.js';

export interface FakeAnswerProviderBehavior {
  intent?: QuestionIntent;
  intentResponse?: string;
  language?: string;
  plan?: Partial<RetrievalPlan>;
  generatedAnswer?: string;
  insufficientContextAnswer?: string;
  intentFallbackResponse?: string;
  onGenerateAnswer?: (question: string) => void;
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
    onGenerateAnswer,
  } = behavior;

  const retrievalPlan: RetrievalPlan = {
    query: planQuery,
    mode: 'direct_evidence',
    entity: '',
    subject: '',
    ...plan,
  };

  return {
    async classifyQuestionIntent() {
      return { intent, response: intentResponse, language };
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
  };
}
