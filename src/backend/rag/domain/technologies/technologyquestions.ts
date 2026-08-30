import type { IRetrievalQuestionPlan } from '../routing/retrievalplan.types.js';
import { normalizeName } from './technologynames.js';

const ENGINEERING_PRACTICE_PATTERN =
  /\b(?:automated\s+tests?|ci\/cd|cicd|code\s+reviews?|continuous\s+(?:delivery|integration)|e2e(?:\s+testing)?|end[-\s]+to[-\s]+end\s+testing|integration\s+tests?|qa|quality\s+assurance|test\s+coverage|testing|unit\s+tests?)\b/iu;
const TECHNOLOGY_SUPPORT_QUESTION_PATTERN =
  /\b(?:do|does|did|can|have|has)\b.{0,50}\b(?:know|use|used|uses|using|work with|works with|support|supports|build with|built with|builds with|have experience with|has experience with)\b|\b(?:which|what)\b.{0,80}\b(?:use|used|using|built with)\b/iu;

export function splitTechnologySubjects(subject: string): string[] {
  return subject
    .split(/\s+(?:and|or)\s+|[,;]+/giu)
    .map(value => value.trim())
    .filter(Boolean)
    .slice(0, 6);
}

export function createTechnologySupportQuery(
  item: IRetrievalQuestionPlan,
  subject: string
): string {
  if (isNamedEntityTechnologyQuestion(item.entity)) {
    return `Does ${item.entity} know ${subject}?`;
  }

  return `Does ARG Software use ${subject}?`;
}

export function isEngineeringPracticeQuestion(question: string, subject: string): boolean {
  return ENGINEERING_PRACTICE_PATTERN.test(`${subject} ${question}`);
}

export function isTechnologySupportQuestion(question: string): boolean {
  return TECHNOLOGY_SUPPORT_QUESTION_PATTERN.test(question);
}

export function isNamedEntityTechnologyQuestion(entity: string): boolean {
  const normalizedEntity = normalizeName(entity);
  return Boolean(normalizedEntity && normalizedEntity !== 'arg' && normalizedEntity !== 'arg software');
}
