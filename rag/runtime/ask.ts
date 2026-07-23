import type { SupabaseClient } from '@supabase/supabase-js';

import { deepSeekAnswerClient } from '../clients/deepseek.js';
import { geminiEmbeddingClient } from '../clients/gemini.js';
import { createSupabaseServiceClient } from '../clients/supabaseClient.js';
import { getRagConfig } from '../config/env.js';
import type {
  AskQuestionResult,
  AnswerProvider,
  ChatMessage,
  Citation,
  EmbeddingProvider,
  PageContext,
  RetrievedContext,
} from '../types/ai.js';
import type { RagConfig } from '../types/config.js';
import type { RagSourceMetadata, RagSourceType } from '../types/source.js';
import { toEmbeddingLiteral } from '../utils/embeddings.js';

const MAX_HISTORY_MESSAGES = 12;
const MAX_HISTORY_MESSAGE_LENGTH = 2000;
const MAX_PAGE_PATH_LENGTH = 200;
const MAX_PAGE_TITLE_LENGTH = 200;
const PROJECT_CONTEXT_SIMILARITY_BOOST = 0.03;

export interface AskQuestionInput {
  question?: unknown;
  messages?: unknown;
  sourceTypes?: unknown;
  pageContext?: unknown;
  retrievalQuestion?: string;
  config?: RagConfig;
  supabase?: SupabaseClient;
  answerProvider?: AnswerProvider;
  embeddingProvider?: EmbeddingProvider;
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

interface RetrievalQuestionInput {
  question: string;
  messages: ChatMessage[];
  pageContext: PageContext | null;
  answerProvider: AnswerProvider;
}

interface PreferredContextsInput {
  supabase: SupabaseClient;
  embedding: number[];
  config: RagConfig;
  sourceTypes: RagSourceType[] | null;
  pageContext: PageContext | null;
  similarityThreshold: number;
}

interface MatchChunksInput {
  supabase: SupabaseClient;
  embedding: number[];
  config: RagConfig;
  sourceTypes?: RagSourceType[] | null;
  sourceKeys?: string[] | null;
  similarityThreshold: number;
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
  pageContext,
  config = getRagConfig(),
  supabase = createSupabaseServiceClient(config),
  answerProvider = deepSeekAnswerClient,
  embeddingProvider = geminiEmbeddingClient,
}: AskQuestionInput = {}): Promise<AskQuestionResult> {
  const normalizedQuestion = normalizeQuestion(question);
  const normalizedMessages = normalizeMessages(messages);
  const normalizedPageContext = normalizePageContext(pageContext);
  const intent = await answerProvider.classifyQuestionIntent(normalizedQuestion, normalizedMessages);

  if (intent.intent !== 'rag_question') {
    const answer =
      intent.response ||
       (await answerProvider.generateIntentFallbackResponse(normalizedQuestion, intent.intent));

    return {
      answer,
      citations: [],
      contexts: [],
    };
  }

  const retrievalQuestion = await createRetrievalQuestion({
    question: normalizedQuestion,
    messages: normalizedMessages,
    pageContext: normalizedPageContext,
    answerProvider,
  });
  const contexts = await retrieveRelevantChunks({
    question: normalizedQuestion,
    retrievalQuestion,
    sourceTypes,
    pageContext: normalizedPageContext,
    config,
    supabase,
    answerProvider,
    embeddingProvider,
  });

  if (contexts.length === 0) {
    const answer = await answerProvider.generateInsufficientContextAnswer(
      normalizedQuestion,
      normalizedMessages
    );

    return {
      answer,
      citations: [],
      contexts: [],
    };
  }

  const answer = await answerProvider.generateAnswer(normalizedQuestion, normalizedMessages, contexts);

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
  pageContext,
  retrievalQuestion,
  config = getRagConfig(),
  supabase = createSupabaseServiceClient(config),
  answerProvider = deepSeekAnswerClient,
  embeddingProvider = geminiEmbeddingClient,
}: AskQuestionInput = {}): Promise<RetrievedContext[]> {
  const normalizedQuestion = normalizeQuestion(question);
  const normalizedMessages = normalizeMessages(messages);
  const normalizedPageContext = normalizePageContext(pageContext);
  const query =
    retrievalQuestion?.trim() ||
    (await createRetrievalQuestion({
      question: normalizedQuestion,
      messages: normalizedMessages,
      pageContext: normalizedPageContext,
      answerProvider,
    }));
  const embedding = await embeddingProvider.embedText(query);
  const normalizedSourceTypes = normalizeSourceTypes(sourceTypes);
  const highConfidenceContexts = await getPreferredContexts({
    supabase,
    embedding,
    config,
    sourceTypes: normalizedSourceTypes,
    pageContext: normalizedPageContext,
    similarityThreshold: config.similarityThreshold,
  });

  if (
    highConfidenceContexts.length >= config.matchCount ||
    config.fallbackSimilarityThreshold >= config.similarityThreshold
  ) {
    return highConfidenceContexts;
  }

  const fallbackContexts = await getPreferredContexts({
    supabase,
    embedding,
    config,
    sourceTypes: normalizedSourceTypes,
    pageContext: normalizedPageContext,
    similarityThreshold: config.fallbackSimilarityThreshold,
  });

  return mergeContexts([highConfidenceContexts, fallbackContexts], normalizedPageContext, config.matchCount);
}

async function createRetrievalQuestion({
  question,
  messages,
  pageContext,
  answerProvider,
}: RetrievalQuestionInput): Promise<string> {
  return answerProvider.rewriteQuestion(question, messages, pageContext);
}

async function getPreferredContexts({
  supabase,
  embedding,
  config,
  sourceTypes,
  pageContext,
  similarityThreshold,
}: PreferredContextsInput): Promise<RetrievedContext[]> {
  const [generalContexts, activeProjectContexts] = await Promise.all([
    matchChunks({
      supabase,
      embedding,
      config,
      sourceTypes,
      similarityThreshold,
    }),
    pageContext?.projectSlug
      ? matchChunks({
          supabase,
          embedding,
          config,
          sourceTypes: ['project'],
          sourceKeys: [pageContext.projectSlug],
          similarityThreshold,
        })
      : Promise.resolve([]),
  ]);

  return mergeContexts([generalContexts, activeProjectContexts], pageContext, config.matchCount);
}

async function matchChunks({
  supabase,
  embedding,
  config,
  sourceTypes = null,
  sourceKeys = null,
  similarityThreshold,
}: MatchChunksInput): Promise<RetrievedContext[]> {
  const { data, error } = await supabase.rpc('match_rag_chunks', {
    query_embedding: toEmbeddingLiteral(embedding),
    match_count: config.matchCount,
    similarity_threshold: similarityThreshold,
    source_types: sourceTypes,
    source_keys: sourceKeys,
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

function mergeContexts(
  contextGroups: RetrievedContext[][],
  pageContext: PageContext | null,
  matchCount: number
): RetrievedContext[] {
  const contexts = contextGroups.flat();
  const uniqueContexts = new Map<string, RetrievedContext>();

  for (const context of contexts) {
    const current = uniqueContexts.get(context.chunkId);
    if (!current || context.similarity > current.similarity) {
      uniqueContexts.set(context.chunkId, context);
    }
  }

  return Array.from(uniqueContexts.values())
    .sort(
      (left, right) =>
        getContextScore(right, pageContext) - getContextScore(left, pageContext) ||
        right.similarity - left.similarity
    )
    .slice(0, matchCount);
}

function getContextScore(context: RetrievedContext, pageContext: PageContext | null): number {
  return (
    context.similarity +
    (pageContext?.projectSlug === context.sourceKey ? PROJECT_CONTEXT_SIMILARITY_BOOST : 0)
  );
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

function normalizePageContext(pageContext: unknown): PageContext | null {
  if (pageContext === undefined || pageContext === null) {
    return null;
  }

  if (!pageContext || typeof pageContext !== 'object' || Array.isArray(pageContext)) {
    throw new RagValidationError('page_context_invalid', 'pageContext must be an object');
  }

  const { pathname, title } = pageContext as Record<string, unknown>;

  if (typeof pathname !== 'string') {
    throw new RagValidationError('page_context_path_invalid', 'pageContext.pathname must be a string');
  }

  const normalizedPathname = pathname.trim();

  if (
    !normalizedPathname ||
    normalizedPathname.length > MAX_PAGE_PATH_LENGTH ||
    !/^\/[a-z0-9/-]*$/i.test(normalizedPathname) ||
    normalizedPathname.startsWith('//')
  ) {
    throw new RagValidationError(
      'page_context_path_invalid',
      'pageContext.pathname must be a site-relative pathname'
    );
  }

  if (typeof title !== 'string') {
    throw new RagValidationError('page_context_title_invalid', 'pageContext.title must be a string');
  }

  const normalizedTitle = title.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();

  if (normalizedTitle.length > MAX_PAGE_TITLE_LENGTH) {
    throw new RagValidationError(
      'page_context_title_too_long',
      `pageContext.title must be ${MAX_PAGE_TITLE_LENGTH} characters or fewer`
    );
  }

  const projectMatch = normalizedPathname.match(/^\/projects\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/i);

  return {
    pathname: normalizedPathname,
    title: normalizedTitle,
    ...(projectMatch ? { projectSlug: projectMatch[1].toLowerCase() } : {}),
  };
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
