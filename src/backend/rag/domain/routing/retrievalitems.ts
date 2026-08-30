import type { IPageContext } from '../conversation/pagecontext.types.js';
import type { IRetrievedContext } from '../sources/retrievedcontext.types.js';
import type { IRetrievalPlan, IRetrievalQuestionPlan } from './retrievalplan.types.js';
import type { IRetrievalRoute } from './retrievalroute.types.js';
import { resolveRetrievalRoute } from './retrievalroute.js';
import { extractTechnologyName } from '../technologies/technologynames.js';
import {
  createTechnologySupportQuery,
  isEngineeringPracticeQuestion,
  isTechnologySupportQuestion,
  splitTechnologySubjects,
} from '../technologies/technologyquestions.js';

interface IContextualRetrievalItem extends IRetrievalQuestionPlan {
  sourceKeys?: string[];
  forceFirstChunks?: boolean;
}

export interface IRoutedRetrievalItem {
  plan: IRetrievalQuestionPlan;
  retrievalQuestion: string;
  route: IRetrievalRoute;
}

export interface IRetrievalItemResult extends IRoutedRetrievalItem {
  contexts: IRetrievedContext[];
}

const CONTEXTUAL_REFERENCE_PATTERN =
  /\b(?:this|current|that)\s+(?:page|project|case|case study|section|article|post|work)\b|\b(?:here|shown here|on this page)\b/i;
const PROJECT_DURATION_PATTERN =
  /\b(?:how much time|how long|time|duration|timeline|took|take|months?|years?|delivery time)\b/i;
const PROJECT_BUDGET_PATTERN = /\b(?:budget|cost|price|pricing)\b/i;
const SERVICE_ENQUIRY_PATTERN =
  /\b(?:assess|build|create|deliver|develop|estimate|fix|help|make|modernize|quote|scope|want|need)\b.{0,80}\b(?:app|application|mvp|platform|product|project|site|software|system|web(?:site)?|web app)\b|\b(?:app|application|mvp|platform|product|project|site|software|system|web(?:site)?|web app)\b.{0,80}\b(?:assess|build|create|deliver|develop|estimate|fix|help|make|modernize|quote|scope)\b/i;

export function createRoutedRetrievalItems(
  plan: IRetrievalPlan & { questions?: IRetrievalQuestionPlan[] },
  question: string,
  pageContext: IPageContext | null = null,
  knownProjectNames: string[] = []
): IRoutedRetrievalItem[] {
  return createRetrievalItems(plan, question, pageContext).map(item => {
    const retrievalQuestion = item.query || question;
    const route = resolveRetrievalRoute(retrievalQuestion, item, knownProjectNames);

    return {
      plan: item,
      retrievalQuestion,
      route: {
        ...route,
        ...(item.sourceKeys ? { sourceKeys: item.sourceKeys } : {}),
        ...(item.forceFirstChunks ? { forceFirstChunks: item.forceFirstChunks } : {}),
      },
    };
  });
}

function createRetrievalItems(
  plan: IRetrievalPlan & { questions?: IRetrievalQuestionPlan[] },
  question: string,
  pageContext: IPageContext | null
): IContextualRetrievalItem[] {
  const items = plan.questions?.length ? plan.questions : [plan];
  return items
    .flatMap(item => createTechnologySubjectItems(item, question))
    .map(item => ({
      query: item.query || question,
      mode:
        shouldUseDirectEvidenceForTechnology(question, item) || isServiceEnquiry(item)
          ? 'direct_evidence'
          : item.mode,
      entity: item.entity,
      subject: item.subject,
    }))
    .map(item => applyPageContext(item, question, pageContext))
    .filter(item => item.query || item.subject || item.entity)
    .slice(0, 6);
}

function applyPageContext(
  item: IRetrievalQuestionPlan,
  originalQuestion: string,
  pageContext: IPageContext | null
): IContextualRetrievalItem {
  if (!pageContext || !isContextualReference(`${originalQuestion} ${item.query}`)) {
    return item;
  }

  if (pageContext.pageKind === 'project' && pageContext.projectName) {
    return applyProjectPageContext(item, originalQuestion, pageContext.projectName);
  }

  if (!pageContext.sourceKeys?.length) {
    return item;
  }

  const targetLabel = getPageContextLabel(pageContext);
  return {
    ...item,
    query: targetLabel ? `${targetLabel} ${item.subject || item.query || originalQuestion}` : item.query,
    sourceKeys: pageContext.sourceKeys,
    forceFirstChunks: true,
  };
}

function applyProjectPageContext(
  item: IRetrievalQuestionPlan,
  originalQuestion: string,
  projectName: string
): IContextualRetrievalItem {
  const text = `${originalQuestion} ${item.query} ${item.subject}`;
  const subject = PROJECT_BUDGET_PATTERN.test(text)
    ? 'project budget'
    : PROJECT_DURATION_PATTERN.test(text)
      ? 'project duration'
      : item.subject;

  return {
    ...item,
    entity: isCompanyEntityName(item.entity) ? projectName : item.entity || projectName,
    subject,
    query: `${projectName} ${subject || item.query || originalQuestion}`.trim(),
  };
}

function isContextualReference(value: string): boolean {
  return CONTEXTUAL_REFERENCE_PATTERN.test(value);
}

function isCompanyEntityName(value: string): boolean {
  return !value || /\b(?:arg|arg software|company|team|studio|you|your)\b/i.test(value.trim());
}

function isServiceEnquiry(item: IRetrievalQuestionPlan): boolean {
  return SERVICE_ENQUIRY_PATTERN.test(`${item.query} ${item.subject}`);
}

function getPageContextLabel(pageContext: IPageContext): string {
  if (pageContext.activeSection) {
    return `${pageContext.activeSection} section`;
  }

  if (pageContext.pageKind === 'blog_post') {
    return `${pageContext.blogSlug || pageContext.title} article`;
  }

  return pageContext.title || pageContext.pathname;
}

function createTechnologySubjectItems(
  item: IRetrievalQuestionPlan,
  originalQuestion: string
): IRetrievalQuestionPlan[] {
  if (
    item.mode === 'article_discovery' ||
    isEngineeringPracticeQuestion(originalQuestion, item.subject) ||
    !isTechnologySupportQuestion(originalQuestion)
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

function shouldUseDirectEvidenceForTechnology(
  originalQuestion: string,
  item: IRetrievalQuestionPlan
): boolean {
  if (
    item.mode === 'article_discovery' ||
    isEngineeringPracticeQuestion(originalQuestion, item.subject) ||
    !isTechnologySupportQuestion(originalQuestion)
  ) {
    return false;
  }

  return Boolean(extractTechnologyName(item.subject));
}
