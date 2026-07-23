import type { SupabaseClient } from '@supabase/supabase-js';

import { deepSeekAnswerClient } from '../clients/deepseek.js';
import { geminiEmbeddingClient } from '../clients/gemini.js';
import { createSupabaseServiceClient } from '../clients/supabaseClient.js';
import { getRagConfig } from '../config/env.js';
import type {
  AnswerClient,
  AskQuestionResult,
  ChatMessage,
  Citation,
  RetrievedContext,
} from '../types/aiClient.js';
import type { RagConfig } from '../types/config.js';
import type { EmbeddingClient } from '../types/embeddings.js';
import type { RagSourceMetadata, RagSourceType } from '../types/ingestion.js';
import { toEmbeddingLiteral } from '../utils/embeddings.js';

const MAX_HISTORY_MESSAGES = 12;
const MAX_HISTORY_MESSAGE_LENGTH = 2000;

interface AskQuestionInput {
  question?: unknown;
  messages?: unknown;
  sourceTypes?: unknown;
  config?: RagConfig;
  supabase?: SupabaseClient;
  answerClient?: AnswerClient;
  embeddingClient?: EmbeddingClient;
}

interface MatchRagChunkRow {
  chunk_id: string;
  source_id: string;
  source_type: RagSourceType;
  source_key: string;
  title: string;
  url: string | null;
  path: string | null;
  chunk_index: number;
  content: string;
  similarity: number;
  source_metadata: RagSourceMetadata | null;
  chunk_metadata: RagSourceMetadata | null;
}

export class RagValidationError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'RagValidationError';
    this.code = code;
  }
}

export async function askQuestion({
  question,
  messages,
  sourceTypes,
  config = getRagConfig(),
  supabase = createSupabaseServiceClient(config),
  answerClient = deepSeekAnswerClient,
  embeddingClient = geminiEmbeddingClient,
}: AskQuestionInput = {}): Promise<AskQuestionResult> {
  const normalizedQuestion = normalizeQuestion(question);
  const normalizedMessages = normalizeMessages(messages);
  const intent = await answerClient.classifyQuestionIntent(normalizedQuestion, normalizedMessages);

  if (intent.intent !== 'rag_question') {
    const answer =
      intent.response ||
      (await answerClient.generateIntentFallbackResponse(normalizedQuestion, intent.intent));

    return {
      answer,
      citations: [],
      contexts: [],
    };
  }

  const retrievalQuestion = await createRetrievalQuestion({
    question: normalizedQuestion,
    messages: normalizedMessages,
    answerClient,
  });
  const contexts = await retrieveRelevantChunks({
    question: retrievalQuestion,
    sourceTypes,
    config,
    supabase,
    answerClient,
    embeddingClient,
  });

  if (contexts.length === 0) {
    const answer = await answerClient.generateInsufficientContextAnswer(
      normalizedQuestion,
      normalizedMessages
    );

    return {
      answer,
      citations: [],
      contexts: [],
    };
  }

  const answer = await answerClient.generateAnswer(normalizedQuestion, normalizedMessages, contexts);

  return {
    answer,
    citations: createCitations(contexts, config.siteUrl),
    contexts,
  };
}

export async function retrieveRelevantChunks({
  question,
  messages,
  sourceTypes,
  config = getRagConfig(),
  supabase = createSupabaseServiceClient(config),
  answerClient = deepSeekAnswerClient,
  embeddingClient = geminiEmbeddingClient,
}: AskQuestionInput = {}): Promise<RetrievedContext[]> {
  const normalizedQuestion = normalizeQuestion(question);
  const normalizedMessages = normalizeMessages(messages);
  const retrievalQuestion = await createRetrievalQuestion({
    question: normalizedQuestion,
    messages: normalizedMessages,
    answerClient,
  });
  const embedding = await embeddingClient.embedText(retrievalQuestion);
  const { data, error } = await supabase.rpc('match_rag_chunks', {
    query_embedding: toEmbeddingLiteral(embedding),
    match_count: config.matchCount,
    similarity_threshold: config.similarityThreshold,
    source_types: normalizeSourceTypes(sourceTypes),
  });

  if (error) {
    throw error;
  }

  return ((data ?? []) as MatchRagChunkRow[]).map(row => ({
    chunkId: row.chunk_id,
    sourceId: row.source_id,
    sourceType: row.source_type,
    sourceKey: row.source_key,
    title: row.title,
    url: resolveUrl(row.url, config.siteUrl),
    path: row.path,
    chunkIndex: row.chunk_index,
    content: row.content,
    similarity: row.similarity,
    sourceMetadata: row.source_metadata ?? {},
    chunkMetadata: row.chunk_metadata ?? {},
  }));
}

async function createRetrievalQuestion({
  question,
  messages,
  answerClient,
}: {
  question: string;
  messages: ChatMessage[];
  answerClient: AnswerClient;
}): Promise<string> {
  return answerClient.rewriteQuestion(question, messages);
}

function createCitations(contexts: RetrievedContext[], siteUrl: string): Citation[] {
  const seen = new Set();
  const citations = [];

  for (const context of contexts) {
    const key = context.url || `${context.sourceType}:${context.sourceKey}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    citations.push({
      title: context.title,
      url: context.url ?? resolveUrl(context.path, siteUrl),
      sourceType: context.sourceType,
      sourceKey: context.sourceKey,
    });
  }

  return citations;
}

function normalizeQuestion(question: unknown): string {
  if (typeof question !== 'string') {
    throw new RagValidationError('question_required', 'Question is required');
  }

  const normalizedQuestion = question.trim();

  if (!normalizedQuestion) {
    throw new RagValidationError('question_required', 'Question is required');
  }

  if (normalizedQuestion.length > 1000) {
    throw new RagValidationError('question_too_long', 'Question must be 1000 characters or fewer');
  }

  return normalizedQuestion;
}

function normalizeSourceTypes(sourceTypes: unknown): RagSourceType[] | null {
  if (!sourceTypes) {
    return null;
  }

  if (!Array.isArray(sourceTypes)) {
    throw new RagValidationError('source_types_invalid', 'sourceTypes must be an array');
  }

  const normalized = sourceTypes.map(sourceType => String(sourceType).trim()).filter(Boolean);
  return normalized.length > 0 ? (normalized as RagSourceType[]) : null;
}

function normalizeMessages(messages: unknown): ChatMessage[] {
  if (!messages) {
    return [];
  }

  if (!Array.isArray(messages)) {
    throw new RagValidationError('messages_invalid', 'messages must be an array');
  }

  return messages.slice(-MAX_HISTORY_MESSAGES).map((message, index) => {
    if (!message || typeof message !== 'object') {
      throw new RagValidationError('message_invalid', `messages[${index}] must be an object`);
    }

    if (!['user', 'assistant'].includes(message.role)) {
      throw new RagValidationError(
        'message_role_invalid',
        `messages[${index}].role must be user or assistant`
      );
    }

    if (typeof message.content !== 'string') {
      throw new RagValidationError(
        'message_content_invalid',
        `messages[${index}].content must be a string`
      );
    }

    const content = message.content.trim();

    if (!content) {
      throw new RagValidationError(
        'message_content_required',
        `messages[${index}].content is required`
      );
    }

    if (content.length > MAX_HISTORY_MESSAGE_LENGTH) {
      throw new RagValidationError(
        'message_content_too_long',
        `messages[${index}].content must be ${MAX_HISTORY_MESSAGE_LENGTH} characters or fewer`
      );
    }

    return {
      role: message.role as ChatMessage['role'],
      content,
    };
  });
}

function resolveUrl(url: string | null | undefined, siteUrl: string): string | null {
  if (!url) {
    return null;
  }

  try {
    return new URL(url, siteUrl).toString();
  } catch {
    return url;
  }
}
