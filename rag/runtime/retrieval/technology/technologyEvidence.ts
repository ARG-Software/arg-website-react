import {
  createExactTermPattern,
  isLikelyExactTechnologySubject,
  normalizeTechnologySubject,
} from './normalizeTechnology.js';

const EXACT_TECHNOLOGY_PATTERNS: Array<{ names: string[]; pattern: RegExp }> = [
  { names: ['go', 'go language', 'golang', 'golang language'], pattern: /\b(?:go|golang)\b/iu },
  { names: ['c#', 'c sharp', 'csharp'], pattern: /(?:^|[^a-z0-9])c#(?=$|[^a-z0-9])/iu },
  { names: ['python', 'python language'], pattern: /\bpython\b/iu },
  { names: ['typescript', 'typescript language'], pattern: /\btypescript\b/iu },
  { names: ['javascript', 'javascript language'], pattern: /\bjavascript\b/iu },
];

export function getExactTechnologyPattern(subject: string): RegExp | null {
  const normalizedSubject = normalizeTechnologySubject(subject);
  const technology = EXACT_TECHNOLOGY_PATTERNS.find(item => item.names.includes(normalizedSubject));

  if (technology) {
    return technology.pattern;
  }

  if (!isLikelyExactTechnologySubject(normalizedSubject)) {
    return null;
  }

  return createExactTermPattern(normalizedSubject);
}

export function removeIdioms(content: string): string {
  return content.replace(/\bgo[-\s]+to\b/giu, '');
}

export function isDisqualifyingTechnologyEvidence(content: string, subject: string): boolean {
  const normalizedSubject = normalizeTechnologySubject(subject);

  if (normalizedSubject !== 'go' && normalizedSubject !== 'golang') {
    return false;
  }

  return (
    /\bnot evidence\b.{0,120}\b(?:uses?|using)\b.{0,40}\b(?:go|golang)\b/iu.test(content) ||
    /\bdo not say\b.{0,120}\b(?:uses?|using)\b.{0,40}\b(?:go|golang)\b/iu.test(content) ||
    /\bonly claim existing use\b.{0,120}\b(?:go|golang)\b/iu.test(content)
  );
}
