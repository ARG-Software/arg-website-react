export type LanguagePreferenceAction = 'none' | 'set' | 'clear';

export interface LanguagePolicyResult {
  responseLanguage: string;
  preferenceAction: LanguagePreferenceAction;
  preferredLanguage?: string;
  topic: 'gaspar_language_capability' | 'response_preference' | 'none';
}

const LANGUAGE_NAME_TO_TAG = new Map([
  ['english', 'en'],
  ['inglês', 'en'],
  ['ingles', 'en'],
  ['spanish', 'es'],
  ['espanhol', 'es'],
  ['español', 'es'],
  ['portuguese', 'pt-PT'],
  ['português', 'pt-PT'],
  ['portugues', 'pt-PT'],
  ['french', 'fr'],
  ['francês', 'fr'],
  ['frances', 'fr'],
  ['français', 'fr'],
  ['german', 'de'],
  ['alemão', 'de'],
  ['alemao', 'de'],
  ['deutsch', 'de'],
  ['dutch', 'nl'],
  ['holandês', 'nl'],
  ['holandes', 'nl'],
  ['russian', 'ru'],
  ['russo', 'ru'],
  ['русский', 'ru'],
  ['italian', 'it'],
  ['italiano', 'it'],
]);

const LANGUAGE_PREFERENCE_PATTERN =
  /\b(?:answer|reply|respond)\s+in\s+([\p{L}-]+)(?:\s+(?:from now on|going forward|always))?\b|\b(?:responde|responder)\s+em\s+([\p{L}-]+)(?:\s+(?:daqui para a frente|a partir de agora|sempre))?\b/iu;
const PERSISTENT_PREFERENCE_PATTERN =
  /\b(?:from now on|going forward|always|daqui para a frente|a partir de agora|sempre)\b/iu;
const CLEAR_PREFERENCE_PATTERN =
  /\b(?:stop|clear|reset)\b.{0,40}\b(?:language preference|preferred language)\b|\b(?:para|limpa|remove|repõe|reseta)\b.{0,40}\b(?:prefer[eê]ncia de idioma|idioma preferido|língua preferida)\b/iu;
const GASPAR_LANGUAGE_CAPABILITY_PATTERN =
  /\b(?:human\s+languages?|languages?\s+(?:can\s+)?(?:you|gaspar)\s+(?:speak|understand|answer|reply|respond|use)|(?:can|could|do|will)\s+(?:you|gaspar)\s+(?:answer|reply|respond)\s+in\b|(?:can|could|do)\s+(?:you|gaspar)\s+speak\s+(?!to\b|with\b)|(?:que|quais)\s+(?:idiomas?|l[ií]nguas?)\s+(?:falas|fala|entendes|compreendes|usas)|(?:falas|fala)\s+(?!com\b|sobre\b|de\b|da\b|do\b|a\b|ao\b|para\b)|(?:respondes|responder|entendes|compreendes)\s+em\b|(?:parles|parlez)\s+(?!avec\b)|(?:hablas|habla)\s+(?!con\b))\b/iu;

export function resolveLanguagePolicy({
  question,
  detectedLanguage,
  preferredLanguage,
}: {
  question: string;
  detectedLanguage: string;
  preferredLanguage?: string;
}): LanguagePolicyResult {
  if (CLEAR_PREFERENCE_PATTERN.test(question)) {
    return {
      responseLanguage: detectedLanguage,
      preferenceAction: 'clear',
      topic: 'response_preference',
    };
  }

  const requestedLanguage = getRequestedResponseLanguage(question);

  if (requestedLanguage) {
    const shouldPersist = PERSISTENT_PREFERENCE_PATTERN.test(question);

    return {
      responseLanguage: requestedLanguage,
      preferenceAction: shouldPersist ? 'set' : 'none',
      ...(shouldPersist ? { preferredLanguage: requestedLanguage } : {}),
      topic: 'response_preference',
    };
  }

  return {
    responseLanguage: preferredLanguage || detectedLanguage,
    preferenceAction: 'none',
    topic: GASPAR_LANGUAGE_CAPABILITY_PATTERN.test(question)
      ? 'gaspar_language_capability'
      : 'none',
  };
}

function getRequestedResponseLanguage(question: string): string | null {
  const match = question.match(LANGUAGE_PREFERENCE_PATTERN);
  const languageName = match?.[1] || match?.[2];

  if (!languageName) {
    return null;
  }

  return LANGUAGE_NAME_TO_TAG.get(languageName.toLowerCase()) || null;
}
