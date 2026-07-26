export function buildResponseLanguageInstruction(responseLanguage: string): string {
  if (!responseLanguage) {
    return 'Answer in the same language as the latest user question.';
  }

  return `The latest user message was assessed as ${responseLanguage}. Answer in that exact language, and do not switch to a related language.`;
}
