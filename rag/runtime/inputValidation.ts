import { getHomepageSectionScope } from '../config/localSources.js';
import type { ChatMessage, PageContext } from '../core/types/chat.js';

const MAX_HISTORY_MESSAGES = 12;
const MAX_HISTORY_MESSAGE_LENGTH = 2000;
const MAX_PAGE_PATH_LENGTH = 200;
const MAX_PAGE_TITLE_LENGTH = 200;

const PROJECT_NAMES_BY_SLUG: Record<string, string> = {
  dokutar: 'Dokutar',
  mojaloop: 'Mojaloop',
  'peoples-clearinghouse': "People's Clearinghouse",
  'royalty-flush': 'Royalty Flush',
  'sky-tracks': 'Sky Tracks',
  'tv-cine': 'TV Cine',
  vector: 'Vector',
};

const STATIC_PAGE_SOURCE_KEYS: Record<string, string[]> = {
  '/about-us': ['about', 'arg-team', 'jose-antunes', 'rui-rocha'],
  '/careers': ['careers-page', 'jobs'],
  '/contact': ['site-links'],
  '/partners': ['partners-page'],
  '/working-with-us': ['working-with-us'],
};

export class RagValidationError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'RagValidationError';
    this.code = code;
  }
}

export function normalizeQuestion(question: unknown): string {
  if (typeof question !== 'string') {
    throw new RagValidationError('question_required', 'Question is required');
  }

  const normalizedQuestion = question.trim();

  if (!normalizedQuestion) {
    throw new RagValidationError('question_required', 'Question is required');
  }

  if (normalizedQuestion.length > 1000) {
    throw new RagValidationError('question_too_long', 'Question must be 1000 characters or fewer');
  }

  return normalizedQuestion;
}

export function normalizeMessages(messages: unknown): ChatMessage[] {
  if (!messages) {
    return [];
  }

  if (!Array.isArray(messages)) {
    throw new RagValidationError('messages_invalid', 'messages must be an array');
  }

  return messages.slice(-MAX_HISTORY_MESSAGES).map((message, index) => {
    if (!message || typeof message !== 'object') {
      throw new RagValidationError('message_invalid', `messages[${index}] must be an object`);
    }

    if (!['user', 'assistant'].includes(message.role)) {
      throw new RagValidationError(
        'message_role_invalid',
        `messages[${index}].role must be user or assistant`
      );
    }

    if (typeof message.content !== 'string') {
      throw new RagValidationError(
        'message_content_invalid',
        `messages[${index}].content must be a string`
      );
    }

    const content = message.content.trim();

    if (!content) {
      throw new RagValidationError(
        'message_content_required',
        `messages[${index}].content is required`
      );
    }

    if (content.length > MAX_HISTORY_MESSAGE_LENGTH) {
      throw new RagValidationError(
        'message_content_too_long',
        `messages[${index}].content must be ${MAX_HISTORY_MESSAGE_LENGTH} characters or fewer`
      );
    }

    return {
      role: message.role as ChatMessage['role'],
      content,
    };
  });
}

export function normalizePageContext(pageContext: unknown): PageContext | null {
  if (pageContext === undefined || pageContext === null) {
    return null;
  }

  if (!pageContext || typeof pageContext !== 'object' || Array.isArray(pageContext)) {
    throw new RagValidationError('page_context_invalid', 'pageContext must be an object');
  }

  const { pathname, title, activeSection } = pageContext as Record<string, unknown>;

  if (typeof pathname !== 'string') {
    throw new RagValidationError('page_context_path_invalid', 'pageContext.pathname must be a string');
  }

  const normalizedPathname = pathname.trim();

  if (
    !normalizedPathname ||
    normalizedPathname.length > MAX_PAGE_PATH_LENGTH ||
    !/^\/[a-z0-9/-]*$/i.test(normalizedPathname) ||
    normalizedPathname.startsWith('//')
  ) {
    throw new RagValidationError(
      'page_context_path_invalid',
      'pageContext.pathname must be a site-relative pathname'
    );
  }

  if (typeof title !== 'string') {
    throw new RagValidationError('page_context_title_invalid', 'pageContext.title must be a string');
  }

  const normalizedTitle = title.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();

  if (normalizedTitle.length > MAX_PAGE_TITLE_LENGTH) {
    throw new RagValidationError(
      'page_context_title_too_long',
      `pageContext.title must be ${MAX_PAGE_TITLE_LENGTH} characters or fewer`
    );
  }

  const projectMatch = normalizedPathname.match(/^\/projects\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/i);
  const blogMatch = normalizedPathname.match(/^\/blog\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/i);
  const normalizedStaticPath = normalizedPathname.replace(/\/+$/, '') || '/';
  const normalizedActiveSection =
    normalizedPathname === '/' && typeof activeSection === 'string'
      ? getHomepageSectionScope(activeSection)
      : null;

  if (activeSection !== undefined && !normalizedActiveSection) {
    throw new RagValidationError(
      'page_context_section_invalid',
      'pageContext.activeSection must be a valid homepage section'
    );
  }

  const projectSlug = projectMatch?.[1].toLowerCase();
  const blogSlug = blogMatch?.[1].toLowerCase();
  const staticSourceKeys = STATIC_PAGE_SOURCE_KEYS[normalizedStaticPath];
  const activeSectionSourceKeys = normalizedActiveSection
    ? normalizedActiveSection.sourceKey === 'home:faq'
      ? ['home:faq', 'faq']
      : [normalizedActiveSection.sourceKey]
    : null;

  return {
    pathname: normalizedPathname,
    title: normalizedTitle,
    ...(projectSlug
      ? {
          pageKind: 'project' as const,
          projectSlug,
          projectName: PROJECT_NAMES_BY_SLUG[projectSlug] ?? getTitleEntity(normalizedTitle, projectSlug),
          sourceKeys: [projectSlug],
        }
      : {}),
    ...(blogSlug
      ? { pageKind: 'blog_post' as const, blogSlug, sourceKeys: [blogSlug] }
      : {}),
    ...(!projectSlug && !blogSlug && normalizedPathname === '/'
      ? {
          pageKind: 'homepage' as const,
          ...(activeSectionSourceKeys ? { sourceKeys: activeSectionSourceKeys } : {}),
        }
      : {}),
    ...(!projectSlug && !blogSlug && staticSourceKeys
      ? { pageKind: 'static_page' as const, sourceKeys: staticSourceKeys }
      : {}),
    ...(normalizedActiveSection ? { activeSection: activeSection as PageContext['activeSection'] } : {}),
  };
}

function getTitleEntity(title: string, fallbackSlug: string): string {
  const cleanedTitle = title
    .replace(/\s*\|\s*Arg Software\s*$/i, '')
    .replace(/\s*-\s*Use Case\s*$/i, '')
    .trim();

  if (cleanedTitle) {
    return cleanedTitle;
  }

  return fallbackSlug
    .split('-')
    .map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}
