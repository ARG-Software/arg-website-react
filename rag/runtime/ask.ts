import type { SupabaseClient } from '@supabase/supabase-js';

import { deepSeekAnswerClient } from '../clients/deepseek.js';
import { geminiEmbeddingClient } from '../clients/gemini.js';
import { createSupabaseServiceClient } from '../clients/supabaseClient.js';
import { getRagConfig } from '../config/env.js';
import type {
  ArticleRecommendation,
  AssistantAction,
  AskQuestionResult,
  AnswerProvider,
  ChatMessage,
  Citation,
  EmbeddingProvider,
  PageContext,
  RetrievedContext,
} from '../types/ai.js';
import type { RagConfig } from '../types/config.js';
import type { RagSourceMetadata, RagSourceOrigin, RagSourceType } from '../types/source.js';
import { toEmbeddingLiteral } from '../utils/embeddings.js';
import { getHomepageSectionScope } from '../config/homepageSections.js';

const MAX_HISTORY_MESSAGES = 12;
const MAX_HISTORY_MESSAGE_LENGTH = 2000;
const MAX_PAGE_PATH_LENGTH = 200;
const MAX_PAGE_TITLE_LENGTH = 200;
const FIRST_PARTY_ORIGINS: RagSourceOrigin[] = ['first_party'];
const TRUSTED_EXTERNAL_ORIGINS: RagSourceOrigin[] = ['trusted_external'];
const PROJECT_CONTACT_QUESTION_PATTERN =
  /\b(?:book|meeting|call|contact|email|reach|talk|speak|discuss|project|service|services|brief|scope|proposal|quote|estimate|budget|pricing|cost|collaborat(?:e|ion)|get started)\b/i;
const CAREERS_QUESTION_PATTERN = /\b(?:career|careers|job|jobs|hiring|hire|apply|application|role|position)\b/i;
const PRICING_QUESTION_PATTERN =
  /\b(?:cost|costed|price|pricing|budget|rate|hourly|how much|quote|estimate)\b/i;
const CAPABILITY_QUESTION_PATTERN =
  /\b(?:do (?:you|arg) (?:work|offer|provide|build|develop|program|implement|create)|does arg (?:work|offer|provide|build|develop|program)|can (?:you|arg) (?:build|develop|program|implement|create)|services?|speciali[sz]|expertise|design|branding|ux\/?ui|embedded systems?|firmware|hardware|robots?|robotics|iot)\b/i;
const TECHNICAL_TOPIC_PATTERN =
  /\b(?:software|code|coding|programming|architecture|backend|frontend|web|api|database|cloud|devops|infrastructure|security|testing|ai|machine learning|automation|microservices|observability|monitoring|metrics|logging|grafana|prometheus|cqrs|event sourcing|domain-driven design|javascript|typescript|react|angular|node(?:\.js)?|\.net|c#|python|java|docker|kubernetes|sql|performance|latency|firmware|hardware|embedded|robotics?|iot|integration)\b/i;
const TECHNICAL_SERVICE_REQUEST_PATTERN =
  /\b(?:can|could|do|does|will|would)\s+(?:you|arg)\s+(?:build|develop|program|implement|create|integrate|deliver|consult)|\b(?:i|we)\s+(?:want|need|would like|are looking for)\b.{0,80}\b(?:build|develop|program|implement|create|integrate|deliver|consult)\b/i;
const PROJECT_CITATION_PATTERN =
  /\b(?:mojaloop|people'?s clearinghouse|dokutar|sky\s*tracks|tv\s*cine|royalty\s*flush|vector)\b/i;
const CURRENT_PROJECT_REFERENCE_PATTERN = /\b(?:this|that|the)\s+(?:project|case study)\b/i;
const CAPABILITY_SOURCE_TYPES: RagSourceType[] = ['homepage', 'about', 'faq', 'working_with_us'];
const PRICING_SOURCE_TYPES: RagSourceType[] = ['project', 'faq', 'working_with_us'];
const BLOG_SOURCE_TYPES: RagSourceType[] = ['blog_post'];

export interface AskQuestionInput {
  question?: unknown;
  messages?: unknown;
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
  sourceOrigin: RagSourceOrigin;
  sourceTypes?: RagSourceType[] | null;
  sourceKeys?: string[] | null;
  similarityThreshold: number;
}

interface MatchChunksInput {
  supabase: SupabaseClient;
  embedding: number[];
  config: RagConfig;
  sourceTypes?: RagSourceType[] | null;
  sourceKeys?: string[] | null;
  sourceOrigin: RagSourceOrigin;
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
  const requiresRag =
    isTechnicalInsightQuestion(normalizedQuestion, normalizedPageContext) ||
    isTechnicalServiceInquiry(normalizedQuestion) ||
    isProjectCited(normalizedQuestion, normalizedPageContext);

  if (intent.intent !== 'rag_question' && !requiresRag) {
    const answer =
      intent.response ||
        (await answerProvider.generateIntentFallbackResponse(
          normalizedQuestion,
          intent.intent,
          intent.language
        ));

    return {
      answer: normalizeAssistantAnswer(answer),
      citations: [],
      articleRecommendations: [],
      actions: createAssistantActions(normalizedQuestion),
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
    pageContext: normalizedPageContext,
    config,
    supabase,
    answerProvider,
    embeddingProvider,
  });

  if (contexts.length === 0) {
    const answer = await answerProvider.generateInsufficientContextAnswer(
      normalizedQuestion,
      normalizedMessages,
      intent.language
    );

    return {
      answer: normalizeAssistantAnswer(answer),
      citations: [],
      articleRecommendations: [],
      actions: createAssistantActions(normalizedQuestion),
      contexts: [],
    };
  }

  const answer = await answerProvider.generateAnswer(
    normalizedQuestion,
    normalizedMessages,
    contexts,
    intent.language
  );

  return {
    answer: normalizeAssistantAnswer(answer),
    citations: createCitations(contexts, config.siteUrl),
    articleRecommendations: createArticleRecommendations(
      contexts,
      normalizedQuestion,
      normalizedPageContext,
      config.siteUrl
    ),
    actions: createAssistantActions(normalizedQuestion),
    contexts,
  };
}

export async function retrieveRelevantChunks({
  question,
  messages,
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
  const retrievalPolicy = getRetrievalPolicy(normalizedQuestion, normalizedPageContext);
  const [firstPartyContexts, trustedExternalContexts] = await Promise.all([
    retrieveContextsForOrigin({
      supabase,
      embedding,
      config,
      sourceOrigin: FIRST_PARTY_ORIGINS[0],
      sourceTypes: retrievalPolicy.firstPartySourceTypes,
    }),
    retrievalPolicy.includeCommercialData
      ? retrieveContextsForOrigin({
          supabase,
          embedding,
          config,
          sourceOrigin: TRUSTED_EXTERNAL_ORIGINS[0],
          sourceTypes: ['external_page'],
          sourceKeys: ['designrush'],
        })
      : Promise.resolve([]),
  ]);

  return mergeComplementaryContexts(
    [firstPartyContexts, trustedExternalContexts],
    config.matchCount
  );
}

async function retrieveContextsForOrigin({
  supabase,
  embedding,
  config,
  sourceOrigin,
  sourceTypes = null,
  sourceKeys = null,
}: Omit<PreferredContextsInput, 'similarityThreshold'>): Promise<RetrievedContext[]> {
  const highConfidenceContexts = await getPreferredContexts({
    supabase,
    embedding,
    config,
    sourceOrigin,
    sourceTypes,
    sourceKeys,
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
    sourceOrigin,
    sourceTypes,
    sourceKeys,
    similarityThreshold: config.fallbackSimilarityThreshold,
  });

  return mergeContexts([highConfidenceContexts, fallbackContexts], config.matchCount);
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
  sourceOrigin,
  sourceTypes,
  sourceKeys,
  similarityThreshold,
}: PreferredContextsInput): Promise<RetrievedContext[]> {
  return matchChunks({
    supabase,
    embedding,
    config,
    sourceOrigin,
    sourceTypes,
    sourceKeys,
    similarityThreshold,
  });
}

async function matchChunks({
  supabase,
  embedding,
  config,
  sourceTypes = null,
  sourceKeys = null,
  sourceOrigin,
  similarityThreshold,
}: MatchChunksInput): Promise<RetrievedContext[]> {
  const { data, error } = await supabase.rpc('match_rag_chunks', {
    query_embedding: toEmbeddingLiteral(embedding),
    match_count: config.matchCount,
    similarity_threshold: similarityThreshold,
    source_types: sourceTypes,
    source_keys: sourceKeys,
    source_origins: [sourceOrigin],
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
    origin: sourceOrigin,
  }));
}

function mergeContexts(
  contextGroups: RetrievedContext[][],
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
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, matchCount);
}

function mergeComplementaryContexts(
  contextGroups: RetrievedContext[][],
  matchCount: number
): RetrievedContext[] {
  const sortedGroups = contextGroups
    .map(contexts => mergeContexts([contexts], matchCount))
    .filter(contexts => contexts.length > 0);
  const leadingContexts = sortedGroups.map(contexts => contexts[0]);
  const remainingContexts = sortedGroups.map(contexts => contexts.slice(1));

  return mergeContexts([leadingContexts, ...remainingContexts], matchCount);
}

function createCitations(contexts: RetrievedContext[], siteUrl: string): Citation[] {
  if (
    contexts.some(
      context => context.origin === 'trusted_external' || context.sourceKey === 'assistant-policy'
    )
  ) {
    return [];
  }

  const seen = new Set();
  const citations = [];

  for (const context of contexts) {
    if (!isNavigableFirstPartyContext(context, siteUrl)) {
      continue;
    }

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

    break;
  }

  return citations;
}

function createArticleRecommendations(
  contexts: RetrievedContext[],
  question: string,
  pageContext: PageContext | null,
  siteUrl: string
): ArticleRecommendation[] {
  if (!isTechnicalInsightQuestion(question, pageContext)) {
    return [];
  }

  const recommendations: ArticleRecommendation[] = [];
  const seenUrls = new Set<string>();

  for (const context of contexts) {
    if (context.sourceType !== 'blog_post' || context.origin !== 'first_party') {
      continue;
    }

    const url = resolveUrl(context.url ?? `/blog/${context.sourceKey}/`, siteUrl);

    if (!url || seenUrls.has(url)) {
      continue;
    }

    seenUrls.add(url);
    recommendations.push({ title: context.title, url });

    if (recommendations.length === 2) {
      break;
    }
  }

  return recommendations;
}

function getRetrievalPolicy(question: string, pageContext: PageContext | null): {
  firstPartySourceTypes: RagSourceType[] | null;
  includeCommercialData: boolean;
} {
  if (PRICING_QUESTION_PATTERN.test(question)) {
    return {
      firstPartySourceTypes: PRICING_SOURCE_TYPES,
      includeCommercialData: true,
    };
  }

  if (CAPABILITY_QUESTION_PATTERN.test(question)) {
    return {
      firstPartySourceTypes: CAPABILITY_SOURCE_TYPES,
      includeCommercialData: false,
    };
  }

  if (isTechnicalInsightQuestion(question, pageContext)) {
    return {
      firstPartySourceTypes: BLOG_SOURCE_TYPES,
      includeCommercialData: false,
    };
  }

  return {
    firstPartySourceTypes: null,
    includeCommercialData: false,
  };
}

function isNavigableFirstPartyContext(context: RetrievedContext, siteUrl: string): boolean {
  if (context.origin !== 'first_party' || context.sourceType === 'local_document' || !context.url) {
    return false;
  }

  try {
    return new URL(context.url).origin === new URL(siteUrl).origin;
  } catch {
    return false;
  }
}

function createAssistantActions(question: string): AssistantAction[] {
  if (CAREERS_QUESTION_PATTERN.test(question)) {
    return [{ type: 'email_hr' }];
  }

  if (PROJECT_CONTACT_QUESTION_PATTERN.test(question) || isTechnicalServiceInquiry(question)) {
    return [{ type: 'book_meeting' }, { type: 'email_hello' }];
  }

  return [];
}

function isTechnicalInsightQuestion(question: string, pageContext: PageContext | null): boolean {
  return TECHNICAL_TOPIC_PATTERN.test(question) && !isTechnicalServiceInquiry(question) && !isProjectCited(question, pageContext);
}

function isTechnicalServiceInquiry(question: string): boolean {
  return CAPABILITY_QUESTION_PATTERN.test(question) || TECHNICAL_SERVICE_REQUEST_PATTERN.test(question);
}

function isProjectCited(question: string, pageContext: PageContext | null): boolean {
  return (
    PROJECT_CITATION_PATTERN.test(question) ||
    (Boolean(pageContext?.projectSlug) && CURRENT_PROJECT_REFERENCE_PATTERN.test(question))
  );
}

function normalizeAssistantAnswer(answer: string): string {
  return normalizeTeamVoice(
    answer
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  );
}

function normalizeTeamVoice(answer: string): string {
  return answer
    .replace(/\bARG(?: Software)? was\b/gi, 'we were')
    .replace(/\bARG(?: Software)? is\b/gi, 'we are')
    .replace(/\bARG(?: Software)? has\b/gi, 'we have')
    .replace(/\bARG(?: Software)? does\b/gi, 'we do')
    .replace(/\bARG(?: Software)? started\b/gi, 'we started')
    .replace(/\bARG(?: Software)? began\b/gi, 'we began')
    .replace(/\bARG(?: Software)? appears\b/gi, 'we appear')
    .replace(/\bARG(?: Software)? offers\b/gi, 'we offer')
    .replace(/\bARG(?: Software)? provides\b/gi, 'we provide')
    .replace(/\bARG(?: Software)? builds\b/gi, 'we build')
    .replace(/\bARG(?: Software)? develops\b/gi, 'we develop')
    .replace(/\bARG(?: Software)? helps\b/gi, 'we help')
    .replace(/\bARG(?: Software)? works\b/gi, 'we work')
    .replace(/\bARG(?: Software)? focuses\b/gi, 'we focus')
    .replace(/\bARG(?: Software)? collaborates\b/gi, 'we collaborate');
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

  const { pathname, title, activeSection } = pageContext as Record<string, unknown>;

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
  const normalizedActiveSection =
    normalizedPathname === '/' && typeof activeSection === 'string'
      ? getHomepageSectionScope(activeSection)
      : null;

  if (activeSection !== undefined && !normalizedActiveSection) {
    throw new RagValidationError(
      'page_context_section_invalid',
      'pageContext.activeSection must be a valid homepage section'
    );
  }

  return {
    pathname: normalizedPathname,
    title: normalizedTitle,
    ...(projectMatch ? { projectSlug: projectMatch[1].toLowerCase() } : {}),
    ...(normalizedActiveSection ? { activeSection: activeSection as PageContext['activeSection'] } : {}),
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
