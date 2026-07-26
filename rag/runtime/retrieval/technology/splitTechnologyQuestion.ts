import type { RetrievalQuestionPlan } from '../../../core/types/retrieval.js';
import { normalizeName } from './normalizeTechnology.js';

const ENGINEERING_PRACTICE_PATTERN =
  /\b(?:automated\s+tests?|ci\/cd|cicd|code\s+reviews?|continuous\s+(?:delivery|integration)|e2e(?:\s+testing)?|end[-\s]+to[-\s]+end\s+testing|integration\s+tests?|qa|quality\s+assurance|test\s+coverage|testing|unit\s+tests?)\b/iu;

export function splitTechnologySubjects(subject: string): string[] {
  return subject
    .split(/\s+(?:and|or)\s+|[,;]+/giu)
    .map(value => value.trim())
    .filter(Boolean)
    .slice(0, 3);
}

export function createTechnologySupportQuery(
  item: RetrievalQuestionPlan,
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

export function isNamedEntityTechnologyQuestion(entity: string): boolean {
  const normalizedEntity = normalizeName(entity);
  return Boolean(
    normalizedEntity && normalizedEntity !== 'arg' && normalizedEntity !== 'arg software'
  );
}
