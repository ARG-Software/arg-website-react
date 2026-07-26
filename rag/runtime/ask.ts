import type { SupabaseClient } from '@supabase/supabase-js';

import { deepSeekAnswerClient } from '../clients/deepseek.js';
import { geminiEmbeddingClient, geminiFallbackEmbeddingClient } from '../clients/gemini.js';
import { createSupabaseServiceClient } from '../clients/supabaseClient.js';
import { getRagConfig } from '../config/env.js';
import type { ChatMessage, PageContext } from '../core/types/chat.js';
import type { RagConfig } from '../core/types/config.js';
import type { RetrievedContext } from '../core/types/context.js';
import type { AskQuestionResult } from '../core/types/output.js';
import type { AnswerProvider, EmbeddingProvider } from '../core/types/providers.js';
import type { EmbeddingIndex, RetrievalQuestionPlan } from '../core/types/retrieval.js';
import type { RagReadRepository } from '../repositories/RagReadRepository.js';
import { SupabaseRagReadRepository } from '../repositories/supabase/SupabaseRagReadRepository.js';
import {
  createArticleRecommendations,
  createAssistantActions,
  createCitations,
  createInsufficientContextActions,
  createPersonClarification,
  normalizeAssistantAnswer,
} from './answerOutput.js';
import { createQueryEmbeddings } from './retrieval/embeddings.js';
import {
  normalizeMessages,
  normalizePageContext,
  normalizeQuestion,
  RagValidationError,
} from './inputValidation.js';
import { resolveRetrievalRoute } from './retrieval/route.js';
import { retrieveRoutedContexts } from './retrieval/retrieve.js';

export { RagValidationError, resolveRetrievalRoute };
export type { RetrievalRoute, RetrievalRouteKind } from './retrieval/route.js';

export interface AskQuestionInput {
  question?: unknown;
  messages?: unknown;
  pageContext?: unknown;
  retrievalQuestion?: string;
  config?: RagConfig;
  readRepository?: RagReadRepository;
  /** @deprecated Pass readRepository instead. Kept for tests that still inject a Supabase client. */
  supabase?: SupabaseClient;
  answerProvider?: AnswerProvider;
  embeddingProvider?: EmbeddingProvider;
  fallbackEmbeddingProvider?: EmbeddingProvider;
}

interface RuntimeContext {
  question: string;
  messages: ChatMessage[];
  pageContext: PageContext | null;
  config: RagConfig;
  readRepository: RagReadRepository;
  answerProvider: AnswerProvider;
  embeddingProvider: EmbeddingProvider;
  fallbackEmbeddingProvider: EmbeddingProvider;
}

export async function askQuestion(input: AskQuestionInput = {}): Promise<AskQuestionResult> {
  const context = createRuntimeContext(input);
  const intent = await context.answerProvider.classifyQuestionIntent(
    context.question,
    context.messages
  );

  if (intent.intent !== 'rag_question') {
    const answer =
      intent.response ||
      (await context.answerProvider.generateIntentFallbackResponse(
        context.question,
        intent.intent,
        intent.language
      ));

    return {
      answer: normalizeAssistantAnswer(answer),
      citations: [],
      articleRecommendations: [],
      actions: createAssistantActions(context.question),
      contexts: [],
    };
  }

  const plan = await context.answerProvider.planRetrieval(
    context.question,
    context.messages,
    context.pageContext
  );
  const retrievalItems = createRetrievalItems(plan, context.question);
  const routedItems = retrievalItems.map(item => {
    const retrievalQuestion = item.query || context.question;
    return {
      plan: item,
      retrievalQuestion,
      route: resolveRetrievalRoute(retrievalQuestion, item),
    };
  });

  if (routedItems.every(item => item.route.requiresPersonClarification)) {
    return {
      answer: createPersonClarification(intent.language),
      citations: [],
      articleRecommendations: [],
      actions: [{ type: 'email_hello' }],
      contexts: [],
    };
  }

  const embeddings = await createSemanticEmbeddings(routedItems, context);
  const retrievalResults = await Promise.all(
    routedItems.map(async (item, index) => {
      if (item.route.requiresPersonClarification) {
        return { ...item, contexts: [] as RetrievedContext[] };
      }

      const semanticSearch = embeddings.get(index);
      const result = await retrieveRoutedContexts({
        retrievalQuestion: item.retrievalQuestion,
        route: item.route,
        config: context.config,
        readRepository: context.readRepository,
        embeddingProvider: context.embeddingProvider,
        fallbackEmbeddingProvider: context.fallbackEmbeddingProvider,
        embedding: semanticSearch?.embedding,
        index: semanticSearch?.index,
      });

      return { ...item, contexts: result.contexts };
    })
  );
  const contexts = mergeRetrievedContexts(
    retrievalResults.map(result => result.contexts),
    Number.MAX_SAFE_INTEGER
  );

  if (contexts.length === 0) {
    const unconfirmedTechnologyAnswer = createUnconfirmedTechnologyAnswer(
      retrievalResults,
      intent.language
    );

    if (unconfirmedTechnologyAnswer) {
      return {
        answer: unconfirmedTechnologyAnswer,
        citations: [],
        articleRecommendations: [],
        actions: createInsufficientContextActions(context.question),
        contexts: [],
      };
    }

    const answer = await context.answerProvider.generateInsufficientContextAnswer(
      context.question,
      context.messages,
      intent.language
    );

    return {
      answer: normalizeAssistantAnswer(answer),
      citations: [],
      articleRecommendations: [],
      actions: createInsufficientContextActions(context.question),
      contexts: [],
    };
  }

  const answer = await context.answerProvider.generateAnswer(
    buildAnswerQuestion(context.question, retrievalResults),
    context.messages,
    contexts,
    intent.language
  );

  return {
    answer: normalizeAssistantAnswer(answer),
    citations: createCitations(contexts, context.config.siteUrl),
    articleRecommendations: mergeArticleRecommendations(
      retrievalResults.map(result =>
        createArticleRecommendations(result.contexts, result.route, context.config.siteUrl)
      )
    ),
    actions: createAssistantActions(context.question),
    contexts,
  };
}

interface RoutedRetrievalItem {
  plan: RetrievalQuestionPlan;
  retrievalQuestion: string;
  route: ReturnType<typeof resolveRetrievalRoute>;
}

interface RetrievalItemResult extends RoutedRetrievalItem {
  contexts: RetrievedContext[];
}

function createRetrievalItems(
  plan: RetrievalQuestionPlan & { questions?: RetrievalQuestionPlan[] },
  question: string
): RetrievalQuestionPlan[] {
  const items = plan.questions?.length ? plan.questions : [plan];
  return items
    .flatMap(item => createTechnologySubjectItems(item, question))
    .map(item => ({
      query: item.query || question,
      mode: shouldUseDirectEvidenceForTechnology(question, item)
        ? ('direct_evidence' as const)
        : item.mode,
      entity: item.entity,
      subject: item.subject,
    }))
    .filter(item => item.query || item.subject || item.entity)
    .slice(0, 3);
}

function createTechnologySubjectItems(
  item: RetrievalQuestionPlan,
  originalQuestion: string
): RetrievalQuestionPlan[] {
  if (
    item.mode === 'article_discovery' ||
    isEngineeringPracticeQuestion(originalQuestion, item.subject) ||
    !TECHNOLOGY_SUPPORT_QUESTION_PATTERN.test(originalQuestion)
  ) {
    return [item];
  }

  const subjects = splitTechnologySubjects(item.subject);

  if (subjects.length <= 1) {
    return [item];
  }

  return subjects.map(subject => ({
    ...item,
    query: createTechnologySupportQuery(item, subject),
    subject,
  }));
}

function splitTechnologySubjects(subject: string): string[] {
  return subject
    .split(/\s+(?:and|or)\s+|[,;]+/giu)
    .map(value => value.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function createTechnologySupportQuery(item: RetrievalQuestionPlan, subject: string): string {
  if (isNamedEntityTechnologyQuestion(item.entity)) {
    return `Does ${item.entity} know ${subject}?`;
  }

  return `Does ARG Software use ${subject}?`;
}

async function createSemanticEmbeddings(
  items: RoutedRetrievalItem[],
  context: RuntimeContext
): Promise<Map<number, { embedding: number[]; index: EmbeddingIndex }>> {
  const semanticItems = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => requiresSemanticEmbedding(item));

  if (semanticItems.length === 0) {
    return new Map();
  }

  const { embeddings, index: embeddingIndex } = await createQueryEmbeddings(
    semanticItems.map(({ item }) => item.retrievalQuestion),
    context.embeddingProvider,
    context.fallbackEmbeddingProvider
  );

  return new Map(
    semanticItems.flatMap(({ index }, batchIndex) => {
      const embedding = embeddings[batchIndex];
      return embedding ? [[index, { embedding, index: embeddingIndex }]] : [];
    })
  );
}

function requiresSemanticEmbedding(item: RoutedRetrievalItem): boolean {
  if (item.route.kind === 'latest_blog' || item.route.requiresPersonClarification) {
    return false;
  }

  return item.route.kind === 'editorial' || Boolean(item.plan.subject);
}

function mergeRetrievedContexts(
  contextGroups: RetrievedContext[][],
  matchCount: number
): RetrievedContext[] {
  const contextsByChunk = new Map<string, RetrievedContext>();

  for (const context of contextGroups.flat()) {
    const current = contextsByChunk.get(context.chunkId);
    if (!current || context.similarity > current.similarity) {
      contextsByChunk.set(context.chunkId, context);
    }
  }

  return Array.from(contextsByChunk.values()).slice(0, matchCount);
}

function mergeArticleRecommendations(
  recommendationGroups: ReturnType<typeof createArticleRecommendations>[]
): ReturnType<typeof createArticleRecommendations> {
  const seenUrls = new Set<string>();
  return recommendationGroups.flat().filter(recommendation => {
    if (seenUrls.has(recommendation.url)) {
      return false;
    }

    seenUrls.add(recommendation.url);
    return true;
  });
}

function buildAnswerQuestion(originalQuestion: string, results: RetrievalItemResult[]): string {
  if (results.length <= 1) {
    return originalQuestion;
  }

  const parts = results
    .map((result, index) => {
      const status = result.contexts.length > 0 ? 'context retrieved' : 'no context retrieved';
      return `${index + 1}. ${result.retrievalQuestion} (${status})`;
    })
    .join('\n');

  return [
    originalQuestion,
    '',
    'The user asked a multi-part question. Answer each part separately and concisely. If a part has no retrieved context, say what we cannot confirm for that part only.',
    'Subquestions:',
    parts,
  ].join('\n');
}

const TECHNOLOGY_DESCRIPTOR_PATTERN =
  /\b(?:arg|background|budget|career|cloud|contact|cost|database|does|duration|experience|framework|know|knowledge|language|library|methodology|platform|price|programming|project|service|software|specific|stack|technology|tool|use|uses|using|with|work|working)\b/giu;
const TECHNOLOGY_SUPPORT_QUESTION_PATTERN =
  /\b(?:do|does|can)\b.{0,50}\b(?:know|use|uses|work with|works with|support|supports|build with|builds with|have experience with|has experience with)\b/iu;
const ENGINEERING_PRACTICE_PATTERN =
  /\b(?:automated\s+tests?|ci\/cd|cicd|code\s+reviews?|continuous\s+(?:delivery|integration)|e2e(?:\s+testing)?|end[-\s]+to[-\s]+end\s+testing|integration\s+tests?|qa|quality\s+assurance|test\s+coverage|testing|unit\s+tests?)\b/iu;
const TECHNOLOGY_DISPLAY_NAMES = new Map([
  ['aws', 'AWS'],
  ['c#', 'C#'],
  ['c sharp', 'C#'],
  ['csharp', 'C#'],
  ['go', 'Go'],
  ['golang', 'Go'],
  ['javascript', 'JavaScript'],
  ['typescript', 'TypeScript'],
]);

function createUnconfirmedTechnologyAnswer(
  results: RetrievalItemResult[],
  responseLanguage: string
): string | null {
  if (results.length !== 1 || !isEnglishResponseLanguage(responseLanguage)) {
    return null;
  }

  if (isNamedEntityTechnologyQuestion(results[0].plan.entity)) {
    return null;
  }

  if (isEngineeringPracticeQuestion(results[0].retrievalQuestion, results[0].plan.subject)) {
    return null;
  }

  const technology =
    extractTechnologyName(results[0].plan.subject) ??
    extractTechnologyName(results[0].retrievalQuestion);

  if (!technology) {
    return null;
  }

  return [
    `${technology} is not part of our usual or preferred stack.`,
    'Our preferred production stack is TypeScript, JavaScript, and C#, and we also use Python when it fits the problem.',
    `That said, the language or tool is just the vehicle for the outcome, not a bottleneck. If ${technology} is the right fit for your project, we can assess and adapt.`,
  ].join(' ');
}

function shouldUseDirectEvidenceForTechnology(
  originalQuestion: string,
  item: RetrievalQuestionPlan
): boolean {
  if (
    item.mode === 'article_discovery' ||
    isEngineeringPracticeQuestion(originalQuestion, item.subject) ||
    !TECHNOLOGY_SUPPORT_QUESTION_PATTERN.test(originalQuestion)
  ) {
    return false;
  }

  return Boolean(extractTechnologyName(item.subject));
}

function isEngineeringPracticeQuestion(question: string, subject: string): boolean {
  return ENGINEERING_PRACTICE_PATTERN.test(`${subject} ${question}`);
}

function isEnglishResponseLanguage(responseLanguage: string): boolean {
  if (!responseLanguage) {
    return true;
  }

  const normalizedLanguage = responseLanguage.toLowerCase();
  return normalizedLanguage.includes('english') || normalizedLanguage.startsWith('en');
}

function isNamedEntityTechnologyQuestion(entity: string): boolean {
  const normalizedEntity = entity
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();

  return Boolean(normalizedEntity && normalizedEntity !== 'arg' && normalizedEntity !== 'arg software');
}

function extractTechnologyName(value: string): string | null {
  const normalizedTechnology = value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9#+. ]/gu, ' ')
    .replace(TECHNOLOGY_DESCRIPTOR_PATTERN, ' ')
    .replace(/\s+/gu, ' ')
    .trim();

  if (!normalizedTechnology || normalizedTechnology.length > 40) {
    return null;
  }

  const words = normalizedTechnology.split(' ');
  if (words.length > 3) {
    return null;
  }

  return TECHNOLOGY_DISPLAY_NAMES.get(normalizedTechnology) ?? toTitleCaseTechnology(normalizedTechnology);
}

function toTitleCaseTechnology(value: string): string {
  return value
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export async function retrieveRelevantChunks(
  input: AskQuestionInput = {}
): Promise<RetrievedContext[]> {
  const context = createRuntimeContext(input);
  const plan = await context.answerProvider.planRetrieval(
    context.question,
    context.messages,
    context.pageContext
  );
  const query = input.retrievalQuestion?.trim() || plan.query || context.question;
  const route = resolveRetrievalRoute(query, plan);

  if (route.requiresPersonClarification) {
    return [];
  }

  const result = await retrieveRoutedContexts({
    retrievalQuestion: query,
    route,
    config: context.config,
    readRepository: context.readRepository,
    embeddingProvider: context.embeddingProvider,
    fallbackEmbeddingProvider: context.fallbackEmbeddingProvider,
  });

  return result.contexts;
}

function createRuntimeContext({
  question,
  messages,
  pageContext,
  config = getRagConfig(),
  readRepository,
  supabase,
  answerProvider = deepSeekAnswerClient,
  embeddingProvider = geminiEmbeddingClient,
  fallbackEmbeddingProvider = geminiFallbackEmbeddingClient,
}: AskQuestionInput): RuntimeContext {
  return {
    question: normalizeQuestion(question),
    messages: normalizeMessages(messages),
    pageContext: normalizePageContext(pageContext),
    config,
    readRepository:
      readRepository ??
      new SupabaseRagReadRepository(
        supabase ?? createSupabaseServiceClient(config),
        config.siteUrl
      ),
    answerProvider,
    embeddingProvider,
    fallbackEmbeddingProvider,
  };
}
