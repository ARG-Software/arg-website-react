export type LanguagePreferenceAction = 'none' | 'set' | 'clear';

export type LanguageTagResolver = (languageName: string) => string | null;

export interface ILanguagePolicyResult {
  responseLanguage: string;
  preferenceAction: LanguagePreferenceAction;
  preferredLanguage?: string;
  topic: 'gaspar_language_capability' | 'response_preference' | 'none';
}

const LANGUAGE_PREFERENCE_PATTERN =
  /\b(?:answer|reply|respond)\s+in\s+([\p{L}-]+)(?:\s+(?:from now on|going forward|always))?\b|\b(?:responde|responder)\s+em\s+([\p{L}-]+)(?:\s+(?:daqui para a frente|a partir de agora|sempre))?\b/iu;
const PERSISTENT_PREFERENCE_PATTERN =
  /\b(?:from now on|going forward|always|daqui para a frente|a partir de agora|sempre)\b/iu;
const CLEAR_PREFERENCE_PATTERN =
  /\b(?:stop|clear|reset)\b.{0,40}\b(?:language preference|preferred language)\b|\b(?:para|limpa|remove|repõe|reseta)\b.{0,40}\b(?:prefer[eê]ncia de idioma|idioma preferido|língua preferida)\b/iu;
const GASPAR_LANGUAGE_CAPABILITY_PATTERN =
  /\b(?:human\s+languages?|languages?\s+(?:can\s+)?(?:you|gaspar)\s+(?:speak|understand|answer|reply|respond|use)|(?:can|could|do|will)\s+(?:you|gaspar)\s+(?:answer|reply|respond)\s+in\b|(?:can|could|do)\s+(?:you|gaspar)\s+speak\s+(?!to\b|with\b)|(?:que|quais)\s+(?:idiomas?|l[ií]nguas?)\s+(?:falas|fala|entendes|compreendes|usas)|(?:falas|fala)\s+(?!com\b|sobre\b|de\b|da\b|do\b|a\b|ao\b|para\b)|(?:respondes|responder|entendes|compreendes)\s+em\b|(?:parles|parlez)\s+(?!avec\b)|(?:hablas|habla)\s+(?!con\b))\b/iu;
const ENGLISH_LANGUAGE_MARKERS = [
  /\b(?:i|you|your|we|they|the|a|an|to|with|why|what|when|where|how|can|could|would|should|want|need|speak|talk|contact|team|answering|english)\b/giu,
];
const PORTUGUESE_LANGUAGE_MARKERS = [
  /\b(?:eu|tu|v[oó]s|voc[eê]s|o|a|os|as|um|uma|para|com|porque|porqu[eê]|qual|quais|quando|onde|como|posso|podes|quero|preciso|falar|contactar|equipa|responder|portugu[eê]s|convosco|ol[aá]|obrigad[oa]|j[aá])\b/giu,
];

export function resolveLanguagePolicy({
  question,
  detectedLanguage,
  preferredLanguage,
  getLanguageTagForName,
}: {
  question: string;
  detectedLanguage: string;
  preferredLanguage?: string;
  getLanguageTagForName: LanguageTagResolver;
}): ILanguagePolicyResult {
  if (CLEAR_PREFERENCE_PATTERN.test(question)) {
    return {
      responseLanguage: detectedLanguage,
      preferenceAction: 'clear',
      topic: 'response_preference',
    };
  }

  const requestedLanguage = getRequestedResponseLanguage(question, getLanguageTagForName);

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

export function detectLatestQuestionLanguage(question: string): string | null {
  const englishScore = countLanguageMarkers(question, ENGLISH_LANGUAGE_MARKERS);
  const portugueseScore = countLanguageMarkers(question, PORTUGUESE_LANGUAGE_MARKERS);

  if (englishScore >= portugueseScore + 2) return 'en';
  if (portugueseScore >= englishScore + 2) return 'pt-PT';

  return null;
}

function getRequestedResponseLanguage(
  question: string,
  getLanguageTagForName: LanguageTagResolver
): string | null {
  const match = question.match(LANGUAGE_PREFERENCE_PATTERN);
  const languageName = match?.[1] || match?.[2];

  if (!languageName) {
    return null;
  }

  return getLanguageTagForName(languageName);
}

function countLanguageMarkers(question: string, markers: RegExp[]): number {
  return markers.reduce((total, marker) => total + (question.match(marker)?.length || 0), 0);
}
