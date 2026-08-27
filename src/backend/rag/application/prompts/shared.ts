import { getAssistantPolicyInstructions } from '../../domain/assistant/assistant.policy.js';

export function buildResponseLanguageInstruction(responseLanguage: string): string {
  if (!responseLanguage) {
    return 'Answer in the same language as the latest user question.';
  }

  return `The latest user message was assessed as ${responseLanguage}. Answer in that exact language, and do not switch to a related language.`;
}

export function buildAssistantPolicyInstructions(): string {
  return getAssistantPolicyInstructions().join(' ');
}
