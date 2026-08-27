export type LanguagePreferenceAction = 'none' | 'set' | 'clear';

export interface ILanguagePolicyResult {
  responseLanguage: string;
  preferenceAction: LanguagePreferenceAction;
  preferredLanguage?: string;
  topic: 'gaspar_language_capability' | 'response_preference' | 'none';
}
