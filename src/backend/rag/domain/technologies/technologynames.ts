import { normalizeName as normalizeTextName } from '../shared/text.js';

const TECHNOLOGY_DESCRIPTOR_PATTERN =
  /\b(?:arg|background|budget|career|cloud|contact|cost|database|does|duration|experience|framework|know|knowledge|language|library|methodology|platform|price|programming|project|service|software|specific|stack|technology|tool|use|uses|using|with|work|working)\b/giu;
const TECHNOLOGY_CATEGORY_WORD_PATTERN =
  /\b(?:cloud|database|framework|language|library|methodology|platform|programming|stack|technology|tool)\b/giu;
const NON_EXACT_TECHNOLOGY_SUBJECT_PATTERN =
  /\b(?:app(?:lication)?s?|automated\s+tests?|autonomy|background|budget|career|case\s+stud(?:y|ies)|ci\/cd|cicd|clients?|code\s+reviews?|collaboration|contact|continuous\s+(?:delivery|integration)|cost|development|domain|duration|e2e(?:\s+testing)?|end[-\s]+to[-\s]+end\s+testing|experience|field|fintech|healthcare|hybrid|industry|industries|integration\s+tests?|manufacturing|maritime|media|mode|mvp|on[-\s]?site|origin|portfolio|price|projects?|qa|quality\s+assurance|references?|referenced|remote|sector|service|team|test\s+coverage|testing|unit\s+tests?|vertical|web(?:site)?s?)\b/iu;
const TECHNOLOGY_DISPLAY_NAMES = new Map([
  ['aws', 'AWS'],
  ['c#', 'C#'],
  ['c sharp', 'C#'],
  ['csharp', 'C#'],
  ['go', 'Go'],
  ['golang', 'Go'],
  ['javascript', 'JavaScript'],
  ['.net', '.NET'],
  ['dotnet', '.NET'],
  ['asp.net', 'ASP.NET Core / .NET'],
  ['aspnet', 'ASP.NET Core / .NET'],
  ['angular', 'Angular'],
  ['docker', 'Docker'],
  ['k8s', 'Kubernetes'],
  ['kubernettes', 'Kubernetes'],
  ['kubernetes', 'Kubernetes'],
  ['react', 'React'],
  ['typescript', 'TypeScript'],
]);
const TECHNOLOGY_SEARCH_TERMS = new Map([
  ['.net', ['.NET', 'dotnet']],
  ['dotnet', ['.NET', 'dotnet']],
  ['asp.net', ['ASP.NET', 'ASP.NET Core', '.NET', 'dotnet']],
  ['aspnet', ['ASP.NET', 'ASP.NET Core', '.NET', 'dotnet']],
  ['angular', ['Angular']],
  ['docker', ['Docker']],
  ['k8s', ['Kubernetes', 'k8s']],
  ['kubernettes', ['Kubernetes', 'k8s']],
  ['kubernetes', ['Kubernetes', 'k8s']],
  ['react', ['React']],
]);

export function normalizeName(value: string): string {
  return normalizeTextName(value);
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

  if (NON_EXACT_TECHNOLOGY_SUBJECT_PATTERN.test(normalizedTechnology)) {
    return null;
  }

  const words = normalizedTechnology.split(' ');
  if (words.length > 3) {
    return null;
  }

  return TECHNOLOGY_DISPLAY_NAMES.get(normalizedTechnology) ?? toTitleCaseTechnology(normalizedTechnology);
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

export function getTechnologySearchTerms(subject: string): string[] {
  const normalizedSubject = normalizeTechnologySubject(subject);
  const explicitTerms = TECHNOLOGY_SEARCH_TERMS.get(normalizedSubject);

  if (explicitTerms) {
    return explicitTerms;
  }

  const displayName = extractTechnologyName(subject);
  return displayName ? [displayName] : [normalizedSubject];
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
