import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveLanguagePolicy } from '../../application/assistant/languagePolicy.js';

test('language policy treats language capability as a topic, not a response preference', () => {
  const result = resolveLanguagePolicy({
    question: 'Olá, falas espanhol?',
    detectedLanguage: 'pt-PT',
  });

  assert.equal(result.responseLanguage, 'pt-PT');
  assert.equal(result.preferenceAction, 'none');
  assert.equal(result.topic, 'gaspar_language_capability');
});

test('language policy sets persistent response language when explicitly requested', () => {
  const result = resolveLanguagePolicy({
    question: 'Answer in Spanish from now on',
    detectedLanguage: 'en',
  });

  assert.equal(result.responseLanguage, 'es');
  assert.equal(result.preferenceAction, 'set');
  assert.equal(result.preferredLanguage, 'es');
  assert.equal(result.topic, 'response_preference');
});

test('language policy resolves configured language aliases beyond the original allowlist', () => {
  const result = resolveLanguagePolicy({
    question: 'Answer in Japanese from now on',
    detectedLanguage: 'en',
  });

  assert.equal(result.responseLanguage, 'ja');
  assert.equal(result.preferenceAction, 'set');
  assert.equal(result.preferredLanguage, 'ja');
});

test('language policy accepts valid BCP-47 language tags directly', () => {
  const result = resolveLanguagePolicy({
    question: 'Answer in pt-BR from now on',
    detectedLanguage: 'en',
  });

  assert.equal(result.responseLanguage, 'pt-BR');
  assert.equal(result.preferenceAction, 'set');
  assert.equal(result.preferredLanguage, 'pt-BR');
});

test('language policy uses saved preference when there is no explicit change', () => {
  const result = resolveLanguagePolicy({
    question: 'What does ARG do?',
    detectedLanguage: 'en',
    preferredLanguage: 'es',
  });

  assert.equal(result.responseLanguage, 'es');
  assert.equal(result.preferenceAction, 'none');
  assert.equal(result.topic, 'none');
});

test('language policy clears saved preference when requested', () => {
  const result = resolveLanguagePolicy({
    question: 'Clear my preferred language',
    detectedLanguage: 'en',
    preferredLanguage: 'es',
  });

  assert.equal(result.responseLanguage, 'en');
  assert.equal(result.preferenceAction, 'clear');
  assert.equal(result.topic, 'response_preference');
});
