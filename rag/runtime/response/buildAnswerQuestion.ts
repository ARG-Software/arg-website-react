import type { RetrievalItemResult } from '../planning/createRetrievalItems.js';

export function buildAnswerQuestion(
  originalQuestion: string,
  results: RetrievalItemResult[]
): string {
  if (results.length <= 1) {
    return originalQuestion;
  }

  const parts = results
    .map((result, index) => {
      const status = result.contexts.length > 0 ? 'context retrieved' : 'no context retrieved';
      return `${index + 1}. ${result.retrievalQuestion} (${status})`;
    })
    .join('\n');

  return [
    originalQuestion,
    '',
    'The user asked a multi-part question. Answer each part separately and concisely. If a part has no retrieved context, say what we cannot confirm for that part only.',
    'Subquestions:',
    parts,
  ].join('\n');
}
