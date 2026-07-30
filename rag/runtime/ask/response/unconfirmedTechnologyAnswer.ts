import type { RetrievalItemResult } from '../planning/createRetrievalItems.js';
import { extractTechnologyName } from '../retrieval/technology/normalizeTechnology.js';
import {
  isEngineeringPracticeQuestion,
  isNamedEntityTechnologyQuestion,
  isTechnologySupportQuestion,
} from '../retrieval/technology/splitTechnologyQuestion.js';

export function createUnconfirmedTechnologyAnswer(
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

  if (!isTechnologySupportQuestion(results[0].retrievalQuestion)) {
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

function isEnglishResponseLanguage(responseLanguage: string): boolean {
  if (!responseLanguage) {
    return true;
  }

  const normalizedLanguage = responseLanguage.toLowerCase();
  return normalizedLanguage.includes('english') || normalizedLanguage.startsWith('en');
}
