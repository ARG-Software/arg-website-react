import type {
  QuestionIntentResult,
  RetrievalMode,
  RetrievalPlan,
  RetrievalQuestionPlan,
} from '../core/types/retrieval.js';

const RAG_INTENT = 'rag_question';
const RETRIEVAL_MODES: RetrievalMode[] = ['direct_evidence', 'editorial', 'article_discovery'];

export function parseIntentResponse(content: string | undefined): QuestionIntentResult {
  if (!content) {
    return { intent: RAG_INTENT, response: '', language: '' };
  }

  try {
    const parsed = JSON.parse(content);

    if (!['small_talk', RAG_INTENT, 'unsupported'].includes(parsed.intent)) {
      return { intent: RAG_INTENT, response: '', language: '' };
    }

    return {
      intent: parsed.intent,
      response: typeof parsed.response === 'string' ? parsed.response.trim() : '',
      language:
        typeof parsed.language === 'string' && parsed.language.length <= 20
          ? parsed.language.trim()
          : '',
    };
  } catch {
    return { intent: RAG_INTENT, response: '', language: '' };
  }
}

export function parseRetrievalPlan(content: string | undefined): RetrievalPlan {
  const fallback: RetrievalPlan = { query: '', mode: 'direct_evidence', entity: '', subject: '' };

  if (!content) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(content);
    const questions = Array.isArray(parsed.questions)
      ? parsed.questions.map(parseRetrievalQuestionPlan).filter(Boolean).slice(0, 3)
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
