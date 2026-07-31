import type {
  ConversationTransformTask,
} from '../../../domain/conversation/ConversationTransform.js';
import type {
  QuestionIntentResult,
} from '../../../domain/conversation/QuestionIntent.js';
import type {
  RetrievalMode,
  RetrievalPlan,
  RetrievalQuestionPlan,
} from '../../../domain/retrieval/RetrievalPlan.js';

const RAG_INTENT = 'rag_question';
const RETRIEVAL_MODES: RetrievalMode[] = ['direct_evidence', 'editorial', 'article_discovery'];
const QUESTION_INTENTS = ['small_talk', RAG_INTENT, 'unsupported', 'conversation_transform'];
const CONVERSATION_TRANSFORM_TASKS: ConversationTransformTask[] = [
  'shorten_previous_answer',
  'simplify_previous_answer',
  'format_previous_answer',
  'expand_previous_answer',
  'translate_previous_answer',
];

export function parseIntentResponse(content: string | undefined): QuestionIntentResult {
  if (!content) {
    return { intent: RAG_INTENT, response: '', language: '' };
  }

  try {
    const parsed = JSON.parse(content);

    if (!QUESTION_INTENTS.includes(parsed.intent)) {
      return { intent: RAG_INTENT, response: '', language: '' };
    }

    const task = parseConversationTransformTask(parsed.task);

    return {
      intent: parsed.intent,
      response: typeof parsed.response === 'string' ? parsed.response.trim() : '',
      language:
        typeof parsed.language === 'string' && parsed.language.length <= 20
          ? parsed.language.trim()
          : '',
      ...(parsed.intent === 'conversation_transform'
        ? { task: task || 'simplify_previous_answer' }
        : {}),
    };
  } catch {
    return { intent: RAG_INTENT, response: '', language: '' };
  }
}

function parseConversationTransformTask(value: unknown): ConversationTransformTask | null {
  return typeof value === 'string' &&
    CONVERSATION_TRANSFORM_TASKS.includes(value as ConversationTransformTask)
    ? (value as ConversationTransformTask)
    : null;
}

export function parseRetrievalPlan(content: string | undefined): RetrievalPlan {
  const fallback: RetrievalPlan = { query: '', mode: 'direct_evidence', entity: '', subject: '' };

  if (!content) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(content);
    const questions = Array.isArray(parsed.questions)
      ? parsed.questions.map(parseRetrievalQuestionPlan).filter(Boolean).slice(0, 6)
      : [];

    if (questions.length > 0) {
      return {
        ...questions[0],
        questions,
      };
    }

    const mode = parseRetrievalMode(parsed.mode);

    if (!mode) {
      return fallback;
    }

    return {
      query: typeof parsed.query === 'string' ? parsed.query.trim().slice(0, 1000) : '',
      mode,
      entity: typeof parsed.entity === 'string' ? parsed.entity.trim().slice(0, 160) : '',
      subject: typeof parsed.subject === 'string' ? parsed.subject.trim().slice(0, 160) : '',
    };
  } catch {
    return fallback;
  }
}

function parseRetrievalQuestionPlan(value: unknown): RetrievalQuestionPlan | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const parsed = value as Record<string, unknown>;
  const mode = parseRetrievalMode(parsed.mode);

  if (!mode) {
    return null;
  }

  return {
    query: typeof parsed.query === 'string' ? parsed.query.trim().slice(0, 1000) : '',
    mode,
    entity: typeof parsed.entity === 'string' ? parsed.entity.trim().slice(0, 160) : '',
    subject: typeof parsed.subject === 'string' ? parsed.subject.trim().slice(0, 160) : '',
  };
}

function parseRetrievalMode(value: unknown): RetrievalMode | null {
  return typeof value === 'string' && RETRIEVAL_MODES.includes(value as RetrievalMode)
    ? (value as RetrievalMode)
    : null;
}
