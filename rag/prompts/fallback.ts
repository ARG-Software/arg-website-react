import type { QuestionIntent } from '../core/types/retrieval.js';
import { buildResponseLanguageInstruction } from './responseLanguage.js';

export function buildIntentFallbackPrompt(
  companyName: string,
  intent: Exclude<QuestionIntent, 'rag_question'>,
  responseLanguage: string
): string {
  return [
    `You are the public website assistant for ${companyName}.`,
    buildResponseLanguageInstruction(responseLanguage),
    intent === 'small_talk'
      ? `Give a brief friendly response and mention that we can help with ${companyName} website topics.`
      : `Politely say that you can help with information published on the ${companyName} website and invite a specific question. Do not list categories or claim coverage that has not been retrieved. Never say you do not have access to conversation history. If the question is a technical service enquiry, say that we need to understand the requirements before assessing it and invite the visitor to book a meeting, use the contact form, or send a message through Gaspar.`,
    'Return plain text only, without Markdown, URLs, or citations.',
  ].join(' ');
}
