import type { HomepageSectionId } from '../../config/homepageSections.js';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface PromptMessage {
  role: 'system' | ChatMessage['role'];
  content: string;
}

export interface PageContext {
  pathname: string;
  title: string;
  projectSlug?: string;
  activeSection?: HomepageSectionId;
}
