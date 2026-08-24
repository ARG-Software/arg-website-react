import crypto from 'node:crypto';

import { AssistantConversationDomainError } from './errors/AssistantConversationDomainError.js';

const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const NONCE_BYTES = 12;
const MAX_MESSAGES = 80;
const MAX_MESSAGE_CONTENT_LENGTH = 4000;
const MAX_CITATIONS = 10;
const MAX_ACTIONS = 10;
const MAX_TEXT_LENGTH = 256;
const CONVERSATION_ID_PATTERN = /^[a-zA-Z0-9._:-]{8,128}$/;

export type AssistantConversationMessageRole = 'user' | 'assistant';

export interface AssistantConversationEncryptionConfig {
  activeKeyVersion: number;
  keys: Record<number, string>;
}

export interface AssistantConversationEncryptedPayload {
  keyVersion: number;
  nonce: string;
  ciphertext: string;
  authTag: string;
}

export interface AssistantConversationReferenceInput {
  title?: string;
  url?: string;
}

export interface AssistantConversationActionInput {
  type?: string;
}

export interface AssistantConversationMessageInput {
  role?: string;
  content?: string;
  source?: string;
  language?: string;
  createdAt?: string;
  citations?: AssistantConversationReferenceInput[];
  articleRecommendations?: AssistantConversationReferenceInput[];
  actions?: AssistantConversationActionInput[];
}

export interface AssistantConversationReference {
  title: string;
  url: string;
}

export interface AssistantConversationAction {
  type: string;
}

export interface AssistantConversationMessage {
  role: AssistantConversationMessageRole;
  content: string;
  source?: string;
  language?: string;
  createdAt?: string;
  citations?: AssistantConversationReference[];
  articleRecommendations?: AssistantConversationReference[];
  actions?: AssistantConversationAction[];
}

export interface AssistantConversationPageContextInput {
  pathname?: string;
  title?: string;
  activeSection?: string;
}

export interface AssistantConversationPageContext {
  pathname: string;
  title: string;
  activeSection?: string;
}

export interface AssistantConversationPayload {
  conversationId: string;
  messages: AssistantConversationMessage[];
  pageContext: AssistantConversationPageContext;
  language: string;
  savedAt: string;
}

export interface AssistantConversationConstructorParams {
  encryption: AssistantConversationEncryptionConfig;
  publicConversationId: string;
  messages: AssistantConversationMessageInput[];
  pageContext?: AssistantConversationPageContextInput;
  language?: string;
  savedAt?: string;
  id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EncryptedAssistantConversationConstructorParams {
  encryption: AssistantConversationEncryptionConfig;
  publicConversationId: string;
  encryptedPayload: AssistantConversationEncryptedPayload;
  messageCount: number;
  pagePath?: string | null;
  language?: string | null;
  lastMessageAt?: string;
  id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssistantConversationMetadata {
  messageCount: number;
  pagePath: string | null;
  language: string | null;
  lastMessageAt: string;
}

export interface AssistantConversationResponse {
  id?: string;
  conversationId: string;
  createdAt?: string;
  updatedAt?: string;
  lastMessageAt: string;
  messageCount: number;
  pagePath: string;
  pageTitle: string;
  language: string;
  preview: string;
  messages?: AssistantConversationMessage[];
  pageContext?: AssistantConversationPageContext;
}

export class AssistantConversation {
  readonly id?: string;
  readonly publicConversationId: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;

  private encryption: AssistantConversationEncryptionConfig;
  private payload: AssistantConversationPayload;
  private encryptedPayload: AssistantConversationEncryptedPayload;
  private metadata: AssistantConversationMetadata;

  constructor(params: AssistantConversationConstructorParams) {
    this.id = params.id;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
    this.encryption = params.encryption;
    this.publicConversationId = normalizeConversationId(params.publicConversationId);

    const messages = normalizeMessages(params.messages);
    const pageContext = normalizePageContext(params.pageContext || {});
    const language = cleanText(params.language || '', 24);
    const savedAt = normalizeDate(params.savedAt || '') || new Date().toISOString();

    this.payload = {
      conversationId: this.publicConversationId,
      messages,
      pageContext,
      language,
      savedAt,
    };
    this.metadata = {
      messageCount: messages.length,
      pagePath: pageContext.pathname || null,
      language: language || null,
      lastMessageAt: getLastMessageAt(messages, savedAt),
    };
    this.encryptedPayload = this.encryptPayload();
  }

  static fromEncrypted(params: EncryptedAssistantConversationConstructorParams): AssistantConversation {
    const payload = decryptPayload(params.encryptedPayload, params.encryption);
    const conversation = Object.create(AssistantConversation.prototype) as AssistantConversation;
    Object.defineProperty(conversation, 'id', { value: params.id, enumerable: true });
    Object.defineProperty(conversation, 'createdAt', { value: params.createdAt, enumerable: true });
    Object.defineProperty(conversation, 'updatedAt', { value: params.updatedAt, enumerable: true });
    Object.defineProperty(conversation, 'publicConversationId', {
      value: normalizeConversationId(params.publicConversationId),
      enumerable: true,
    });
    conversation.encryption = params.encryption;
    conversation.payload = payload;
    conversation.encryptedPayload = params.encryptedPayload;
    conversation.metadata = {
      messageCount: params.messageCount,
      pagePath: params.pagePath || payload.pageContext.pathname || null,
      language: params.language || payload.language || null,
      lastMessageAt: params.lastMessageAt || getLastMessageAt(payload.messages, payload.savedAt),
    };

    return conversation;
  }

  hasVisitorMessage(): boolean {
    return this.payload.messages.some(message => message.role === 'user');
  }

  getPayload(): AssistantConversationPayload {
    return this.payload;
  }

  getEncryptedPayload(): AssistantConversationEncryptedPayload {
    return this.encryptedPayload;
  }

  getMetadata(): AssistantConversationMetadata {
    return this.metadata;
  }

  toResponse(params: { includeTranscript?: boolean } = {}): AssistantConversationResponse {
    const includeTranscript = Boolean(params.includeTranscript);
    const messages = this.payload.messages;
    const pageContext = this.payload.pageContext;

    return {
      id: this.id,
      conversationId: this.publicConversationId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastMessageAt: this.metadata.lastMessageAt,
      messageCount: this.metadata.messageCount,
      pagePath: this.metadata.pagePath || pageContext.pathname || '',
      pageTitle: pageContext.title || '',
      language: this.metadata.language || this.payload.language || '',
      preview: this.getPreview(),
      ...(includeTranscript ? { messages, pageContext } : {}),
    };
  }

  private getPreview(): string {
    const firstUserMessage = this.payload.messages.find(
      message => message.role === 'user' && message.content
    );
    const content =
      firstUserMessage?.content ||
      this.payload.messages.find(message => message.content)?.content ||
      '';

    return truncateText(content, 140);
  }

  private encryptPayload(): AssistantConversationEncryptedPayload {
    const keyVersion = this.encryption.activeKeyVersion;
    const key = getEncryptionKey(keyVersion, this.encryption);
    const nonce = crypto.randomBytes(NONCE_BYTES);
    const cipher = crypto.createCipheriv(ALGORITHM, key, nonce);
    const plaintext = Buffer.from(JSON.stringify(this.payload), 'utf8');
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

    return {
      keyVersion,
      nonce: nonce.toString('base64'),
      ciphertext: ciphertext.toString('base64'),
      authTag: cipher.getAuthTag().toString('base64'),
    };
  }
}

export class AssistantConversationList {
  constructor(
    private readonly records: AssistantConversation[],
    private readonly pagination: { page: number; pageSize: number; totalRecords: number; totalPages: number }
  ) {}

  toResponse(): { records: AssistantConversationResponse[]; pagination: { page: number; pageSize: number; totalRecords: number; totalPages: number } } {
    return {
      records: this.records.map(record => record.toResponse()),
      pagination: this.pagination,
    };
  }
}

function decryptPayload(
  encryptedPayload: AssistantConversationEncryptedPayload,
  encryption: AssistantConversationEncryptionConfig
): AssistantConversationPayload {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getEncryptionKey(encryptedPayload.keyVersion, encryption),
    Buffer.from(encryptedPayload.nonce, 'base64')
  );
  decipher.setAuthTag(Buffer.from(encryptedPayload.authTag, 'base64'));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encryptedPayload.ciphertext, 'base64')),
    decipher.final(),
  ]);
  const parsedPayload = JSON.parse(plaintext.toString('utf8')) as AssistantConversationPayload;

  return {
    conversationId: normalizeConversationId(parsedPayload.conversationId),
    messages: normalizeMessages(parsedPayload.messages),
    pageContext: normalizePageContext(parsedPayload.pageContext),
    language: cleanText(parsedPayload.language, 24),
    savedAt: normalizeDate(parsedPayload.savedAt) || new Date().toISOString(),
  };
}

function normalizeConversationId(value: string): string {
  const conversationId = String(value || '').trim();

  if (!CONVERSATION_ID_PATTERN.test(conversationId)) {
    throw AssistantConversationDomainError.invalidConversationId();
  }

  return conversationId;
}

function normalizeMessages(value: AssistantConversationMessageInput[]): AssistantConversationMessage[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw AssistantConversationDomainError.invalidMessages();
  }

  const messages = value.slice(0, MAX_MESSAGES).flatMap(normalizeMessage);

  if (messages.length === 0) {
    throw AssistantConversationDomainError.noValidMessages();
  }

  return messages;
}

function normalizeMessage(message: AssistantConversationMessageInput): AssistantConversationMessage[] {
  const role = cleanText(message.role || '', 20);
  const content = cleanText(message.content || '', MAX_MESSAGE_CONTENT_LENGTH);

  if (!isValidRole(role) || !content) return [];

  return [
    {
      role,
      content,
      ...(message.source ? { source: cleanText(message.source, 40) } : {}),
      ...(message.language ? { language: cleanText(message.language, 24) } : {}),
      ...(message.createdAt ? { createdAt: normalizeDate(message.createdAt) } : {}),
      ...(Array.isArray(message.citations)
        ? {
            citations: message.citations
              .slice(0, MAX_CITATIONS)
              .flatMap(normalizeReference),
          }
        : {}),
      ...(Array.isArray(message.articleRecommendations)
        ? {
            articleRecommendations: message.articleRecommendations
              .slice(0, MAX_CITATIONS)
              .flatMap(normalizeReference),
          }
        : {}),
      ...(Array.isArray(message.actions)
        ? { actions: message.actions.slice(0, MAX_ACTIONS).flatMap(normalizeAction) }
        : {}),
    },
  ];
}

function normalizeReference(item: AssistantConversationReferenceInput): AssistantConversationReference[] {
  return [
    {
      title: cleanText(item.title || '', MAX_TEXT_LENGTH),
      url: cleanText(item.url || '', MAX_TEXT_LENGTH),
    },
  ];
}

function normalizeAction(action: AssistantConversationActionInput): AssistantConversationAction[] {
  const type = cleanText(action.type || '', 80);

  return type ? [{ type }] : [];
}

function normalizePageContext(value: AssistantConversationPageContextInput): AssistantConversationPageContext {
  return {
    pathname: cleanText(value.pathname || '', MAX_TEXT_LENGTH),
    title: cleanText(value.title || '', MAX_TEXT_LENGTH),
    ...(value.activeSection ? { activeSection: cleanText(value.activeSection, 80) } : {}),
  };
}

function getLastMessageAt(messages: AssistantConversationMessage[], fallbackIso: string): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const createdAt = normalizeDate(messages[index].createdAt || '');
    if (createdAt) return createdAt;
  }

  return fallbackIso;
}

function normalizeDate(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function cleanText(value: string, maxLength: number): string {
  return removeControlCharacters(String(value || ''))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function removeControlCharacters(value: string): string {
  return [...value]
    .map(character => {
      const code = character.charCodeAt(0);

      return code < 32 || code === 127 ? ' ' : character;
    })
    .join('');
}

function truncateText(value: string, maxLength: number): string {
  const text = cleanText(value, maxLength + 1);

  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function isValidRole(value: string): value is AssistantConversationMessageRole {
  return value === 'user' || value === 'assistant';
}

function getEncryptionKey(version: number, encryption: AssistantConversationEncryptionConfig): Buffer {
  const value = encryption.keys[version];
  if (!value) throw AssistantConversationDomainError.missingEncryptionKey(version);

  const key = decodeKey(value);
  if (key.length !== KEY_BYTES) throw AssistantConversationDomainError.invalidEncryptionKey(version);

  return key;
}

function decodeKey(value: string): Buffer {
  const trimmed = value.trim();

  if (/^[a-f0-9]{64}$/i.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }

  const base64 = Buffer.from(trimmed, 'base64');
  if (base64.length === KEY_BYTES) {
    return base64;
  }

  return Buffer.from(trimmed, 'utf8');
}
