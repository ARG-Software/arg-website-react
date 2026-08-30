import type { RagSourceMetadata } from '../sources/ragsource.types.js';

const BROAD_PERSON_PROFILE_PATTERN =
  /\b(?:background|bio|biography|career|education|experience|profile|stud(?:y|ies)|who is|tell me about)\b/iu;
const PROFESSIONAL_BACKGROUND_PATTERN =
  /\b(?:background|career|education|experience|professional|stud(?:y|ies)|work)\b/iu;
const COMPANY_ORIGIN_PATTERN = /\b(?:founded|founder|origin|started|start|began|begin|created)\b/iu;

export function isBroadPersonProfileSubject(subject: string): boolean {
  return BROAD_PERSON_PROFILE_PATTERN.test(subject);
}

export function asksProfessionalBackground(subject: string): boolean {
  return PROFESSIONAL_BACKGROUND_PATTERN.test(subject);
}

export function asksCompanyOrigin(subject: string): boolean {
  return COMPANY_ORIGIN_PATTERN.test(subject);
}

export function getPersonKey(metadata: RagSourceMetadata | null | undefined): string | null {
  return typeof metadata?.person_key === 'string' ? metadata.person_key : null;
}
