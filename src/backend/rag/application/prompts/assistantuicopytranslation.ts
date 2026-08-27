export function buildAssistantUiCopyTranslationPrompt(language: string): string {
  return [
    `Translate the JSON values to ${language}.`,
    'Return only valid JSON with the exact same object shape and keys.',
    'Translate string values and string array values only. Never rename, add, or remove keys.',
    'Keep ARG Software, ARG, Gaspar, email addresses, URLs, placeholders, analytics names, and product/project names unchanged.',
    'For leadCaptureSkipWords, return short natural user inputs that mean skip/no message in the target language.',
    'Keep the tone warm, concise, and professional.',
  ].join(' ');
}
