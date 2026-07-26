import type { RetrievalQuestionPlan } from '../../core/types/retrieval.js';

const ENGINEERING_PRACTICE_PATTERN =
  /\b(?:automated\s+tests?|ci\/cd|cicd|code\s+reviews?|continuous\s+(?:delivery|integration)|e2e(?:\s+testing)?|end[-\s]+to[-\s]+end\s+testing|integration\s+tests?|qa|quality\s+assurance|test\s+coverage|testing|unit\s+tests?)\b/iu;
const TECHNOLOGY_DESCRIPTOR_PATTERN =
  /\b(?:arg|background|budget|career|cloud|contact|cost|database|does|duration|experience|framework|know|knowledge|language|library|methodology|platform|price|programming|project|service|software|specific|stack|technology|tool|use|uses|using|with|work|working)\b/giu;
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
  const normalizedEntity = entity
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();

  return Boolean(
    normalizedEntity && normalizedEntity !== 'arg' && normalizedEntity !== 'arg software'
  );
}

export function extractTechnologyName(value: string): string | null {
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

  return (
    TECHNOLOGY_DISPLAY_NAMES.get(normalizedTechnology) ??
    toTitleCaseTechnology(normalizedTechnology)
  );
}

function toTitleCaseTechnology(value: string): string {
  return value
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
