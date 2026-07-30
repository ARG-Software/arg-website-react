import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSystemPrompt } from '../../prompts/answering.js';
import { buildIntentFallbackPrompt } from '../../prompts/fallback.js';
import { buildInsufficientContextPrompt } from '../../prompts/insufficientContext.js';
import { buildIntentPrompt } from '../../prompts/intent.js';
import { buildRetrievalPlanPrompt } from '../../prompts/retrievalPlan.js';

const COMPANY_NAME = 'ARG Software';

test('answer prompt establishes Gaspar as the first-person speaker', () => {
  const prompt = buildSystemPrompt(COMPANY_NAME, 'en');

  assert.match(prompt, /You are Gaspar/u);
  assert.match(prompt, /Always speak as Gaspar in the first person/u);
  assert.match(prompt, /never say you are not Gaspar/u);
  assert.match(prompt, /Facts about Gaspar in the provided context are facts about you/u);
  assert.match(prompt, /Never describe yourself as an AI assistant/u);
  assert.doesNotMatch(prompt, /You are the public website assistant/u);
});

test('Gaspar prompts handle visitor names conversationally', () => {
  const answerPrompt = buildSystemPrompt(COMPANY_NAME, 'en');
  const smallTalkPrompt = buildIntentFallbackPrompt(COMPANY_NAME, 'small_talk', 'en');
  const intentPrompt = buildIntentPrompt(COMPANY_NAME);

  assert.match(answerPrompt, /ask for their name/u);
  assert.match(answerPrompt, /address them by that name naturally/u);
  assert.match(answerPrompt, /do not immediately pivot to generic help copy/u);

  assert.match(smallTalkPrompt, /address them by that name naturally/u);
  assert.match(smallTalkPrompt, /ask for their name/u);
  assert.match(smallTalkPrompt, /does not make the response feel transactional/u);

  assert.match(intentPrompt, /visitor name introductions/u);
  assert.match(intentPrompt, /just the visitor sharing their name/u);
  assert.match(intentPrompt, /do not immediately pivot to generic help copy/u);
});

test('fallback prompt keeps small-talk and unsupported responses in Gaspar persona', () => {
  const smallTalkPrompt = buildIntentFallbackPrompt(COMPANY_NAME, 'small_talk', 'en');
  const unsupportedPrompt = buildIntentFallbackPrompt(COMPANY_NAME, 'unsupported', 'en');

  assert.match(smallTalkPrompt, /You are Gaspar/u);
  assert.match(smallTalkPrompt, /Never describe yourself as an AI assistant/u);
  assert.doesNotMatch(smallTalkPrompt, /You are the public website assistant/u);

  assert.match(unsupportedPrompt, /You are Gaspar/u);
  assert.match(unsupportedPrompt, /send you a message here/u);
  assert.doesNotMatch(unsupportedPrompt, /send a message through Gaspar/u);
});

test('insufficient-context prompt stays in Gaspar persona', () => {
  const prompt = buildInsufficientContextPrompt(COMPANY_NAME, 'en');

  assert.match(prompt, /You are Gaspar/u);
  assert.match(prompt, /Never describe yourself as an AI assistant/u);
  assert.match(prompt, /send you a message here/u);
  assert.doesNotMatch(prompt, /You are the public website assistant/u);
  assert.doesNotMatch(prompt, /send a message through Gaspar/u);
});

test('intent prompt requires direct response text to be spoken by Gaspar', () => {
  const prompt = buildIntentPrompt(COMPANY_NAME);

  assert.match(prompt, /website voice, Gaspar/u);
  assert.match(prompt, /response text you return is spoken by Gaspar in the first person/u);
  assert.match(prompt, /Never describe the speaker as an AI assistant/u);
  assert.match(prompt, /whether the speaker is an AI, robot, chatbot, language model, or real/u);
  assert.doesNotMatch(prompt, /^You route messages for [^.]*public website assistant\./u);
});

test('intent prompt separates answer rewrites from source-grounded summaries', () => {
  const prompt = buildIntentPrompt(COMPANY_NAME);

  assert.match(prompt, /conversation_transform means/u);
  assert.match(prompt, /make it brief/u);
  assert.match(prompt, /I did not understand/u);
  assert.match(prompt, /Do not use conversation_transform when the visitor asks to summarize or explain a specific source/u);
  assert.match(prompt, /article or blog summaries/u);
});

test('retrieval planner treats direct AI and robot questions as Gaspar profile questions', () => {
  const prompt = buildRetrievalPlanPrompt();

  assert.match(prompt, /For Gaspar identity or profile questions/u);
  assert.match(prompt, /whether you are an AI, robot, chatbot, language model, or real/u);
  assert.match(prompt, /use entity "Gaspar" and subject "assistant profile"/u);
});
