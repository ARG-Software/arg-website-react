import type {
  ArticleRecommendation,
  AssistantAction,
  Citation,
  RetrievedContext,
} from '../types/ai.js';
import { resolveUrl } from './url.js';
import type { RetrievalRoute } from './retrieval/route.js';

const PROJECT_CONTACT_QUESTION_PATTERN =
  /\b(?:book|meeting|call|contact|email|reach|talk|speak|discuss|project|service|services|brief|scope|proposal|quote|estimate|budget|pricing|cost|collaborat(?:e|ion)|get started)\b/i;
const HIRE_ARG_QUESTION_PATTERN =
  /\b(?:hire|engage|work with)\b.{0,40}\b(?:arg|you|you guys|your team|your studio)\b|\b(?:arg|you|you guys|your team|your studio)\b.{0,40}\b(?:for hire|hire|engage)\b/i;
const CAREERS_QUESTION_PATTERN = /\b(?:career|careers|job|jobs|hiring|hire|apply|application|role|position)\b/i;

export function createCitations(contexts: RetrievedContext[], siteUrl: string): Citation[] {
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

export function createArticleRecommendations(
  contexts: RetrievedContext[],
  route: RetrievalRoute,
  siteUrl: string
): ArticleRecommendation[] {
  if (route.kind !== 'editorial' && route.kind !== 'latest_blog') {
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

export function createAssistantActions(question: string): AssistantAction[] {
  if (HIRE_ARG_QUESTION_PATTERN.test(question)) {
    return [{ type: 'book_meeting' }, { type: 'email_hello' }];
  }

  if (CAREERS_QUESTION_PATTERN.test(question)) {
    return [{ type: 'email_hr' }];
  }

  if (PROJECT_CONTACT_QUESTION_PATTERN.test(question)) {
    return [{ type: 'book_meeting' }, { type: 'email_hello' }];
  }

  return [];
}

export function createInsufficientContextActions(question: string): AssistantAction[] {
  const actions = createAssistantActions(question);

  return actions.some(action => action.type === 'email_hello')
    ? actions
    : [...actions, { type: 'email_hello' }];
}

export function createPersonClarification(responseLanguage: string): string {
  if (responseLanguage.toLowerCase().startsWith('pt')) {
    return 'De quem está a falar? Diga-me o nome da pessoa para eu poder verificar a nossa informação pública.';
  }

  if (responseLanguage.toLowerCase().startsWith('es')) {
    return '¿De quién hablas? Dime el nombre de la persona para que pueda comprobar nuestra información pública.';
  }

  return 'Who do you mean? Please tell me the person’s name so I can check our public information.';
}

export function normalizeAssistantAnswer(answer: string): string {
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
