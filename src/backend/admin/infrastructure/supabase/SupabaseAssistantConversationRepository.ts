import crypto from 'node:crypto';

import type { IAssistantConversationRepository } from '../../application/ports/repositories/IAssistantConversationRepository.js';
import { AssistantConversation } from '../../domain/assistantConversation.js';
import type {
  AssistantConversationMessage,
  AssistantConversationPageContext,
} from '../../domain/types/AssistantConversationTypes.js';

const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const NONCE_BYTES = 12;

type AssistantConversationEncryptionConfig = {
  activeKeyVersion: number;
  keys: Record<number, string>;
};

type AssistantConversationEncryptedPayload = {
  keyVersion: number;
  nonce: string;
  ciphertext: string;
  authTag: string;
};

type AssistantConversationPayload = {
  conversationId: string;
  messages: AssistantConversationMessage[];
  pageContext: AssistantConversationPageContext;
  language: string;
  savedAt: string;
};

export class SupabaseAssistantConversationRepository implements IAssistantConversationRepository {
  constructor(
    private readonly client: any,
    private readonly encryption: AssistantConversationEncryptionConfig
  ) {}

  async upsert(conversation: AssistantConversation) {
    const row = toDatabaseRow(conversation, this.encryption);
    const { data, error } = await this.client
      .from('assistant_conversations')
      .upsert(row, { onConflict: 'public_conversation_id' })
      .select('*')
      .single();

    if (error) throw error;

    return toConversationRecord(data, this.encryption);
  }

  async list({ page = 1, pageSize = 10 } = {}) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await this.client
      .from('assistant_conversations')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      records: data.map(row => toConversationRecord(row, this.encryption)),
      pagination: {
        page,
        pageSize,
        totalRecords: count || 0,
        totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
      },
    };
  }

  async findById(id) {
    const { data, error } = await this.client
      .from('assistant_conversations')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return toConversationRecord(data, this.encryption);
  }

  async deleteById(id) {
    const { error } = await this.client.from('assistant_conversations').delete().eq('id', id);

    if (error) throw error;
  }

  async deleteOlderThan(cutoffIso) {
    const { count, error } = await this.client
      .from('assistant_conversations')
      .delete({ count: 'exact' })
      .lt('updated_at', cutoffIso);

    if (error) throw error;

    return count || 0;
  }
}

function toDatabaseRow(
  conversation: AssistantConversation,
  encryption: AssistantConversationEncryptionConfig
) {
  const encryptedPayload = encryptPayload(
    {
      conversationId: conversation.publicConversationId,
      messages: conversation.messages,
      pageContext: conversation.pageContext,
      language: conversation.language,
      savedAt: conversation.savedAt,
    },
    encryption
  );

  return {
    public_conversation_id: conversation.publicConversationId,
    payload_key_version: encryptedPayload.keyVersion,
    payload_nonce: encryptedPayload.nonce,
    payload_ciphertext: encryptedPayload.ciphertext,
    payload_auth_tag: encryptedPayload.authTag,
    message_count: conversation.messageCount,
    page_path: conversation.pagePath,
    language: conversation.language || null,
    last_message_at: conversation.lastMessageAt,
  };
}

function toConversationRecord(row, encryption: AssistantConversationEncryptionConfig) {
  const payload = decryptPayload(
    {
      keyVersion: row.payload_key_version,
      nonce: row.payload_nonce,
      ciphertext: row.payload_ciphertext,
      authTag: row.payload_auth_tag,
    },
    encryption
  );

  return new AssistantConversation({
    id: row.id,
    publicConversationId: row.public_conversation_id,
    messages: payload.messages,
    pageContext: payload.pageContext,
    language: payload.language,
    savedAt: payload.savedAt,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function encryptPayload(
  payload: AssistantConversationPayload,
  encryption: AssistantConversationEncryptionConfig
): AssistantConversationEncryptedPayload {
  const keyVersion = encryption.activeKeyVersion;
  const key = getEncryptionKey(keyVersion, encryption);
  const nonce = crypto.randomBytes(NONCE_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, nonce);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  return {
    keyVersion,
    nonce: nonce.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
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

  return JSON.parse(plaintext.toString('utf8'));
}

function getEncryptionKey(version: number, encryption: AssistantConversationEncryptionConfig): Buffer {
  const value = encryption.keys[version];
  if (!value) {
    throw createEncryptionError(
      'missing_assistant_conversation_encryption_key',
      `Missing assistant conversation encryption key for version ${version}`
    );
  }

  const trimmed = value.trim();
  let key = Buffer.from(trimmed, 'utf8');

  if (/^[a-f0-9]{64}$/i.test(trimmed)) {
    key = Buffer.from(trimmed, 'hex');
  } else if (Buffer.from(trimmed, 'base64').length === KEY_BYTES) {
    key = Buffer.from(trimmed, 'base64');
  }

  if (key.length !== KEY_BYTES) {
    throw createEncryptionError(
      'invalid_assistant_conversation_encryption_key',
      `Assistant conversation encryption key version ${version} must decode to 32 bytes`
    );
  }

  return key;
}

function createEncryptionError(code: string, message: string): Error & { code: string } {
  const error = new Error(message) as Error & { code: string };
  error.code = code;

  return error;
}
