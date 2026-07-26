import { getHomepageSectionScope } from '../config/homepageSections.js';
import type { ChatMessage, PageContext } from '../core/types/chat.js';

const MAX_HISTORY_MESSAGES = 12;
const MAX_HISTORY_MESSAGE_LENGTH = 2000;
const MAX_PAGE_PATH_LENGTH = 200;
const MAX_PAGE_TITLE_LENGTH = 200;

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

  return {
    pathname: normalizedPathname,
    title: normalizedTitle,
    ...(projectMatch ? { projectSlug: projectMatch[1].toLowerCase() } : {}),
    ...(normalizedActiveSection ? { activeSection: activeSection as PageContext['activeSection'] } : {}),
  };
}
