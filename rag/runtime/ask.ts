import type { SupabaseClient } from '@supabase/supabase-js';

import { deepSeekAnswerClient } from '../clients/deepseek.js';
import {
  GeminiEmbeddingQuotaError,
  geminiEmbeddingClient,
  geminiFallbackEmbeddingClient,
} from '../clients/gemini.js';
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
const FINTECH_SOURCE_TYPES: RagSourceType[] = ['project', 'about', 'homepage', 'working_with_us'];
const PERSON_COMPANION_SOURCE_TYPES: RagSourceType[] = ['working_with_us'];
const LATEST_BLOG_PATTERN =
  /\b(?:latest|newest|most recent|recent)\b.{0,50}\b(?:articles?|blog posts?|posts?)\b|\b(?:articles?|blog posts?|posts?)\b.{0,50}\b(?:latest|newest|most recent|recent)\b/i;
const BLOG_REFERENCE_PATTERN = /\b(?:articles?|blog posts?|posts?)\b/i;
const FINANCE_DOMAIN_PATTERN =
  /\b(?:fintech|financial|payments?|banking|clearing|settlement|trading|financial inclusion)\b/i;
const PERSONAL_PRONOUN_PATTERN = /\b(?:he|she|they|him|her|his|hers|them|their|theirs)\b/i;
const PERSON_PROFILE_SOURCE_KEYS: Record<string, string> = {
  'josé antunes': 'jose-antunes',
  'jose antunes': 'jose-antunes',
  'rui rocha': 'rui-rocha',
};
const COMPANY_TECHNOLOGY_TERMS = [
  'typescript',
  'javascript',
  'c#',
  'python',
  'react',
  'angular',
  'node.js',
  'docker',
  'kubernetes',
];

export interface AskQuestionInput {
  question?: unknown;
  messages?: unknown;
  pageContext?: unknown;
  retrievalQuestion?: string;
  config?: RagConfig;
  supabase?: SupabaseClient;
  answerProvider?: AnswerProvider;
  embeddingProvider?: EmbeddingProvider;
  fallbackEmbeddingProvider?: EmbeddingProvider;
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

interface DirectSourceRow {
  id: string;
  source_type: RagSourceType;
  source_key: string;
  title: string;
  url: string | null;
  path: string | null;
  origin: RagSourceOrigin;
  is_public: boolean;
  metadata: RagSourceMetadata | null;
}

interface DirectChunkRow {
  id: string;
  source_id: string;
  chunk_index: number;
  content: string;
  metadata: RagSourceMetadata | null;
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
  matchFunction: MatchFunction;
  sourceOrigin: RagSourceOrigin;
  sourceTypes?: RagSourceType[] | null;
  sourceKeys?: string[] | null;
  similarityThreshold: number;
}

interface MatchChunksInput {
  supabase: SupabaseClient;
  embedding: number[];
  config: RagConfig;
  matchFunction: MatchFunction;
  sourceTypes?: RagSourceType[] | null;
  sourceKeys?: string[] | null;
  sourceOrigin: RagSourceOrigin;
  similarityThreshold: number;
}

type MatchFunction = 'match_rag_chunks' | 'match_rag_chunks_fallback';

export type RetrievalRouteKind =
  | 'latest_blog'
  | 'person_profile'
  | 'fintech'
  | 'pricing'
  | 'capability'
  | 'technical_insight'
  | 'general';

export interface RetrievalRoute {
  kind: RetrievalRouteKind;
  firstPartySourceTypes: RagSourceType[] | null;
  includeCommercialData: boolean;
  personSourceKey?: string;
  requiresPersonClarification?: boolean;
}

interface RetrievalResult {
  contexts: RetrievedContext[];
  route: RetrievalRoute;
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
  fallbackEmbeddingProvider = geminiFallbackEmbeddingClient,
}: AskQuestionInput = {}): Promise<AskQuestionResult> {
  const normalizedQuestion = normalizeQuestion(question);
  const normalizedMessages = normalizeMessages(messages);
  const normalizedPageContext = normalizePageContext(pageContext);
  const intent = await answerProvider.classifyQuestionIntent(normalizedQuestion, normalizedMessages);
  const requiresRag =
    isLikelyBlogRequest(normalizedQuestion) ||
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
  const route = resolveRetrievalRoute(retrievalQuestion, normalizedPageContext);

  if (route.requiresPersonClarification) {
    return {
      answer: createPersonClarification(intent.language),
      citations: [],
      articleRecommendations: [],
      actions: [{ type: 'email_hello' }],
      contexts: [],
    };
  }

  const { contexts } = await retrieveRoutedContexts({
    question: normalizedQuestion,
    messages: normalizedMessages,
    retrievalQuestion,
    pageContext: normalizedPageContext,
    route,
    config,
    supabase,
    answerProvider,
    embeddingProvider,
    fallbackEmbeddingProvider,
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
      actions: createInsufficientContextActions(normalizedQuestion),
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
      route,
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
  fallbackEmbeddingProvider = geminiFallbackEmbeddingClient,
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
  const route = resolveRetrievalRoute(query, normalizedPageContext);

  if (route.requiresPersonClarification) {
    return [];
  }

  const result = await retrieveRoutedContexts({
    question: normalizedQuestion,
    messages: normalizedMessages,
    retrievalQuestion: query,
    pageContext: normalizedPageContext,
    route,
    config,
    supabase,
    answerProvider,
    embeddingProvider,
    fallbackEmbeddingProvider,
  });

  return result.contexts;
}

async function retrieveRoutedContexts({
  retrievalQuestion,
  route,
  config,
  supabase,
  embeddingProvider,
  fallbackEmbeddingProvider,
}: {
  question: string;
  messages: ChatMessage[];
  retrievalQuestion: string;
  pageContext: PageContext | null;
  route: RetrievalRoute;
  config: RagConfig;
  supabase: SupabaseClient;
  answerProvider: AnswerProvider;
  embeddingProvider: EmbeddingProvider;
  fallbackEmbeddingProvider: EmbeddingProvider;
}): Promise<RetrievalResult> {
  if (route.kind === 'latest_blog') {
    return {
      contexts: await retrieveLatestBlogContexts(supabase, config),
      route,
    };
  }

  const directProfileContexts = route.personSourceKey
    ? await retrieveDirectSourceContexts(supabase, config, 'about', route.personSourceKey)
    : [];
  const companyTechnologyContexts = route.personSourceKey
    ? await retrieveCompanyTechnologyContexts(supabase, config, retrievalQuestion)
    : [];
  const { embedding, matchFunction } = await createQueryEmbedding(
    retrievalQuestion,
    embeddingProvider,
    fallbackEmbeddingProvider
  );
  const [firstPartyContexts, trustedExternalContexts] = await Promise.all([
    retrieveContextsForOrigin({
      supabase,
      embedding,
      config,
      matchFunction,
      sourceOrigin: FIRST_PARTY_ORIGINS[0],
      sourceTypes: route.firstPartySourceTypes,
    }),
    route.includeCommercialData
      ? retrieveContextsForOrigin({
          supabase,
          embedding,
          config,
          matchFunction,
          sourceOrigin: TRUSTED_EXTERNAL_ORIGINS[0],
          sourceTypes: ['external_page'],
          sourceKeys: ['designrush'],
        })
      : Promise.resolve([]),
  ]);

  return {
    contexts: mergeComplementaryContexts(
      [directProfileContexts, companyTechnologyContexts, firstPartyContexts, trustedExternalContexts],
      config.matchCount
    ),
    route,
  };
}

async function createQueryEmbedding(
  query: string,
  embeddingProvider: EmbeddingProvider,
  fallbackEmbeddingProvider: EmbeddingProvider
): Promise<{ embedding: number[]; matchFunction: MatchFunction }> {
  try {
    return {
      embedding: await embeddingProvider.embedText(query),
      matchFunction: 'match_rag_chunks',
    };
  } catch (error) {
    if (!(error instanceof GeminiEmbeddingQuotaError)) {
      throw error;
    }

    return {
      embedding: await fallbackEmbeddingProvider.embedText(query),
      matchFunction: 'match_rag_chunks_fallback',
    };
  }
}

async function retrieveContextsForOrigin({
  supabase,
  embedding,
  config,
  matchFunction,
  sourceOrigin,
  sourceTypes = null,
  sourceKeys = null,
}: Omit<PreferredContextsInput, 'similarityThreshold'>): Promise<RetrievedContext[]> {
  const highConfidenceContexts = await getPreferredContexts({
    supabase,
    embedding,
    config,
    matchFunction,
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
    matchFunction,
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
  matchFunction,
  sourceOrigin,
  sourceTypes,
  sourceKeys,
  similarityThreshold,
}: PreferredContextsInput): Promise<RetrievedContext[]> {
  return matchChunks({
    supabase,
    embedding,
    config,
    matchFunction,
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
  matchFunction,
  sourceTypes = null,
  sourceKeys = null,
  sourceOrigin,
  similarityThreshold,
}: MatchChunksInput): Promise<RetrievedContext[]> {
  const { data, error } = await supabase.rpc(matchFunction, {
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

async function retrieveLatestBlogContexts(
  supabase: SupabaseClient,
  config: RagConfig
): Promise<RetrievedContext[]> {
  const { data, error } = await supabase
    .from('rag_sources')
    .select('id, source_type, source_key, title, url, path, origin, is_public, metadata')
    .eq('source_type', 'blog_post')
    .eq('origin', FIRST_PARTY_ORIGINS[0])
    .eq('is_public', true);

  if (error) {
    throw error;
  }

  const newestSources = ((data ?? []) as DirectSourceRow[])
    .map(source => ({ source, timestamp: getPublicationTimestamp(source.metadata) }))
    .filter((item): item is { source: DirectSourceRow; timestamp: number } => item.timestamp !== null)
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, 3)
    .map(item => item.source);

  return retrieveFirstChunksForSources(supabase, config, newestSources);
}

async function retrieveDirectSourceContexts(
  supabase: SupabaseClient,
  config: RagConfig,
  sourceType: RagSourceType,
  sourceKey: string
): Promise<RetrievedContext[]> {
  const { data, error } = await supabase
    .from('rag_sources')
    .select('id, source_type, source_key, title, url, path, origin, is_public, metadata')
    .eq('source_type', sourceType)
    .eq('source_key', sourceKey)
    .eq('origin', FIRST_PARTY_ORIGINS[0])
    .eq('is_public', true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data
    ? retrieveFirstChunksForSources(supabase, config, [data as DirectSourceRow])
    : [];
}

async function retrieveCompanyTechnologyContexts(
  supabase: SupabaseClient,
  config: RagConfig,
  retrievalQuestion: string
): Promise<RetrievedContext[]> {
  const technology = getCompanyTechnologyTerm(retrievalQuestion);

  if (!technology) {
    return [];
  }

  const { data: source, error: sourceError } = await supabase
    .from('rag_sources')
    .select('id, source_type, source_key, title, url, path, origin, is_public, metadata')
    .eq('source_type', 'working_with_us')
    .eq('source_key', 'working-with-us')
    .eq('origin', FIRST_PARTY_ORIGINS[0])
    .eq('is_public', true)
    .maybeSingle();

  if (sourceError) {
    throw sourceError;
  }

  if (!source) {
    return [];
  }

  const { data: chunks, error: chunkError } = await supabase
    .from('rag_chunks')
    .select('id, source_id, chunk_index, content, metadata')
    .eq('source_id', source.id)
    .ilike('content', `%${technology}%`)
    .order('chunk_index')
    .limit(1);

  if (chunkError) {
    throw chunkError;
  }

  return ((chunks ?? []) as DirectChunkRow[]).map(chunk =>
    createDirectContext(source as DirectSourceRow, chunk, config)
  );
}

async function retrieveFirstChunksForSources(
  supabase: SupabaseClient,
  config: RagConfig,
  sources: DirectSourceRow[]
): Promise<RetrievedContext[]> {
  if (sources.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('rag_chunks')
    .select('id, source_id, chunk_index, content, metadata')
    .in(
      'source_id',
      sources.map(source => source.id)
    )
    .eq('chunk_index', 0);

  if (error) {
    throw error;
  }

  const chunksBySourceId = new Map(
    ((data ?? []) as DirectChunkRow[]).map(chunk => [chunk.source_id, chunk])
  );

  return sources.flatMap(source => {
    const chunk = chunksBySourceId.get(source.id);

    if (!chunk) {
      return [];
    }

    return [createDirectContext(source, chunk, config)];
  });
}

function createDirectContext(
  source: DirectSourceRow,
  chunk: DirectChunkRow,
  config: RagConfig
): RetrievedContext {
  return {
    chunkId: chunk.id,
    sourceId: source.id,
    sourceType: source.source_type,
    sourceKey: source.source_key,
    title: source.title,
    url: resolveUrl(source.url, config.siteUrl),
    path: source.path,
    chunkIndex: chunk.chunk_index,
    content: chunk.content,
    similarity: 1,
    sourceMetadata: source.metadata ?? {},
    chunkMetadata: chunk.metadata ?? {},
    origin: source.origin,
  };
}

function getPublicationTimestamp(metadata: RagSourceMetadata | null): number | null {
  const date = metadata?.date;
  const timestamp = typeof date === 'string' ? Date.parse(date) : Number.NaN;
  return Number.isNaN(timestamp) ? null : timestamp;
}

function getCompanyTechnologyTerm(question: string): string | undefined {
  const lowerCaseQuestion = question.toLowerCase();
  return COMPANY_TECHNOLOGY_TERMS.find(technology => lowerCaseQuestion.includes(technology));
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
  route: RetrievalRoute,
  siteUrl: string
): ArticleRecommendation[] {
  if (route.kind !== 'technical_insight' && route.kind !== 'latest_blog') {
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

    if (recommendations.length === (route.kind === 'latest_blog' ? 3 : 2)) {
      break;
    }
  }

  return recommendations;
}

export function resolveRetrievalRoute(
  retrievalQuestion: string,
  pageContext: PageContext | null = null
): RetrievalRoute {
  if (LATEST_BLOG_PATTERN.test(retrievalQuestion)) {
    return {
      kind: 'latest_blog',
      firstPartySourceTypes: BLOG_SOURCE_TYPES,
      includeCommercialData: false,
    };
  }

  const personSourceKey = getPersonSourceKey(retrievalQuestion);

  if (personSourceKey) {
    return {
      kind: 'person_profile',
      firstPartySourceTypes: PERSON_COMPANION_SOURCE_TYPES,
      includeCommercialData: false,
      personSourceKey,
    };
  }

  if (PERSONAL_PRONOUN_PATTERN.test(retrievalQuestion)) {
    return {
      kind: 'general',
      firstPartySourceTypes: null,
      includeCommercialData: false,
      requiresPersonClarification: true,
    };
  }

  if (BLOG_REFERENCE_PATTERN.test(retrievalQuestion)) {
    return {
      kind: 'general',
      firstPartySourceTypes: BLOG_SOURCE_TYPES,
      includeCommercialData: false,
    };
  }

  if (FINANCE_DOMAIN_PATTERN.test(retrievalQuestion)) {
    return {
      kind: 'fintech',
      firstPartySourceTypes: FINTECH_SOURCE_TYPES,
      includeCommercialData: false,
    };
  }

  if (PRICING_QUESTION_PATTERN.test(retrievalQuestion)) {
    return {
      kind: 'pricing',
      firstPartySourceTypes: PRICING_SOURCE_TYPES,
      includeCommercialData: true,
    };
  }

  if (CAPABILITY_QUESTION_PATTERN.test(retrievalQuestion)) {
    return {
      kind: 'capability',
      firstPartySourceTypes: CAPABILITY_SOURCE_TYPES,
      includeCommercialData: false,
    };
  }

  if (isTechnicalInsightQuestion(retrievalQuestion, pageContext)) {
    return {
      kind: 'technical_insight',
      firstPartySourceTypes: BLOG_SOURCE_TYPES,
      includeCommercialData: false,
    };
  }

  return {
    kind: 'general',
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

function createInsufficientContextActions(question: string): AssistantAction[] {
  const actions = createAssistantActions(question);

  return actions.some(action => action.type === 'email_hello')
    ? actions
    : [...actions, { type: 'email_hello' }];
}

function isLikelyBlogRequest(question: string): boolean {
  return BLOG_REFERENCE_PATTERN.test(question) || LATEST_BLOG_PATTERN.test(question);
}

function getPersonSourceKey(question: string): string | undefined {
  const normalizedQuestion = question.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

  return Object.entries(PERSON_PROFILE_SOURCE_KEYS).find(([name]) =>
    normalizedQuestion.includes(name.normalize('NFD').replace(/\p{Diacritic}/gu, ''))
  )?.[1];
}

function createPersonClarification(responseLanguage: string): string {
  if (responseLanguage.toLowerCase().startsWith('pt')) {
    return 'De quem está a falar? Diga-me o nome da pessoa para eu poder verificar a nossa informação pública.';
  }

  if (responseLanguage.toLowerCase().startsWith('es')) {
    return '¿De quién hablas? Dime el nombre de la persona para que pueda comprobar nuestra información pública.';
  }

  return 'Who do you mean? Please tell me the person’s name so I can check our public information.';
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
