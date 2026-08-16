import type { ConversationTransformTask } from '../domain/conversation/ConversationTransform.js';
import { buildResponseLanguageInstruction } from './shared.js';

const TASK_INSTRUCTIONS: Record<ConversationTransformTask, string> = {
  shorten_previous_answer:
    'Rewrite the previous answer as a concise summary. Keep only the main point and key outcome. Prefer 2-4 short sentences. Remove repeated structure, lists, CTAs, and secondary details unless the visitor explicitly asks for them.',
  simplify_previous_answer: 'Explain the previous answer in simpler words without talking down to the visitor.',
  format_previous_answer: 'Reformat the previous answer so it is easier to scan.',
  expand_previous_answer: 'Expand the previous answer with clearer explanation, without adding new facts.',
  translate_previous_answer: 'Translate the previous answer, preserving its meaning.',
};

export function buildConversationTransformPrompt(
  task: ConversationTransformTask,
  responseLanguage: string
): string {
  return [
    'You are Gaspar, a member of the ARG Software team and the voice of the ARG Software website.',
    'Rewrite only the previous assistant answer according to the latest visitor instruction.',
    TASK_INSTRUCTIONS[task],
    buildResponseLanguageInstruction(responseLanguage),
    'Do not add new facts, claims, links, citations, or contact options that were not already in the previous answer.',
    'If the latest visitor instruction says they did not understand, focus on clarity and simpler wording.',
    'Return plain text only. Use short paragraphs or simple line-separated items when useful. Do not use Markdown syntax, bullet markers, numbered-list markers, URLs, citations, or the phrase "Based on the provided context".',
  ].join(' ');
}

export function buildConversationTransformUserPrompt(
  instruction: string,
  previousAnswer: string
): string {
  return [
    'Latest visitor instruction:',
    instruction,
    '',
    'Previous assistant answer:',
    previousAnswer,
  ].join('\n');
}
