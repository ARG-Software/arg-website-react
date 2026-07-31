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
  pageKind?: 'project' | 'homepage' | 'static_page' | 'blog_post';
  projectSlug?: string;
  projectName?: string;
  blogSlug?: string;
  activeSection?: string;
  sourceKeys?: string[];
}
