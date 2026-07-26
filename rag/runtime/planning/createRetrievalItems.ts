import type { RetrievedContext } from '../../core/types/context.js';
import type {
  RetrievalPlan,
  RetrievalQuestionPlan,
  RetrievalRoute,
} from '../../core/types/retrieval.js';
import { resolveRetrievalRoute } from '../retrieval/route.js';
import { extractTechnologyName } from '../retrieval/technology/normalizeTechnology.js';
import {
  createTechnologySupportQuery,
  isEngineeringPracticeQuestion,
  splitTechnologySubjects,
} from '../retrieval/technology/splitTechnologyQuestion.js';

const TECHNOLOGY_SUPPORT_QUESTION_PATTERN =
  /\b(?:do|does|can)\b.{0,50}\b(?:know|use|uses|work with|works with|support|supports|build with|builds with|have experience with|has experience with)\b/iu;

export interface RoutedRetrievalItem {
  plan: RetrievalQuestionPlan;
  retrievalQuestion: string;
  route: RetrievalRoute;
}

export interface RetrievalItemResult extends RoutedRetrievalItem {
  contexts: RetrievedContext[];
}

export function createRoutedRetrievalItems(
  plan: RetrievalPlan & { questions?: RetrievalQuestionPlan[] },
  question: string
): RoutedRetrievalItem[] {
  return createRetrievalItems(plan, question).map(item => {
    const retrievalQuestion = item.query || question;
    return {
      plan: item,
      retrievalQuestion,
      route: resolveRetrievalRoute(retrievalQuestion, item),
    };
  });
}

function createRetrievalItems(
  plan: RetrievalPlan & { questions?: RetrievalQuestionPlan[] },
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
    .slice(0, 6);
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
