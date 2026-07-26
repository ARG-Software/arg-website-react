const TECHNOLOGY_DESCRIPTOR_PATTERN =
  /\b(?:arg|background|budget|career|cloud|contact|cost|database|does|duration|experience|framework|know|knowledge|language|library|methodology|platform|price|programming|project|service|software|specific|stack|technology|tool|use|uses|using|with|work|working)\b/giu;
const TECHNOLOGY_CATEGORY_WORD_PATTERN =
  /\b(?:cloud|database|framework|language|library|methodology|platform|programming|stack|technology|tool)\b/giu;
const NON_EXACT_TECHNOLOGY_SUBJECT_PATTERN =
  /\b(?:automated\s+tests?|background|budget|career|ci\/cd|cicd|code\s+reviews?|contact|continuous\s+(?:delivery|integration)|cost|duration|e2e(?:\s+testing)?|end[-\s]+to[-\s]+end\s+testing|experience|fintech|integration\s+tests?|origin|price|project|qa|quality\s+assurance|service|team|test\s+coverage|testing|unit\s+tests?)\b/iu;
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

export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function isCompanyEntity(entity: string): boolean {
  const normalizedEntity = normalizeName(entity);
  return normalizedEntity === 'arg' || normalizedEntity === 'arg software';
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

export function normalizeTechnologySubject(subject: string): string {
  return subject
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(TECHNOLOGY_CATEGORY_WORD_PATTERN, ' ')
    .replace(/[^a-z0-9#+. ]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function isLikelyExactTechnologySubject(normalizedSubject: string): boolean {
  if (!normalizedSubject || normalizedSubject.length > 40) {
    return false;
  }

  if (NON_EXACT_TECHNOLOGY_SUBJECT_PATTERN.test(normalizedSubject)) {
    return false;
  }

  return normalizedSubject.split(' ').length <= 3;
}

export function createExactTermPattern(normalizedSubject: string): RegExp {
  const escapedTerms = normalizedSubject
    .split(' ')
    .map(term => term.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'));

  return new RegExp(`(?:^|[^a-z0-9])${escapedTerms.join('\\s+')}(?=$|[^a-z0-9])`, 'iu');
}

function toTitleCaseTechnology(value: string): string {
  return value
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
