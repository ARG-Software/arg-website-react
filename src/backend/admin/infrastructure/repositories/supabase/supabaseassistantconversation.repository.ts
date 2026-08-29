import type { SupabaseClient } from '@supabase/supabase-js';

import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { logOperation } from '../../../../shared/logger/logoperation.js';
import type { IAdminConfiguration } from '../../../application/config/iadmin.configuration.js';
import { decode, isValidKey } from '../../../application/crypto/decode.js';
import { encode, type EncodedValue } from '../../../application/crypto/encode.js';
import type {
  AssistantConversationUpsertResult,
  IAssistantConversationRepository,
} from '../../../application/ports/repositories/iassistantconversation.repository.js';
import { AssistantConversation } from '../../../domain/assistantconversation.js';
import type {
  AssistantConversationMessage,
  AssistantConversationPagination,
  AssistantConversationPageContext,
} from '../../../domain/types/assistantconversation.types.js';

type AssistantConversationPayload = {
  conversationId: string;
  messages: AssistantConversationMessage[];
  pageContext: AssistantConversationPageContext;
  language: string;
  savedAt: string;
};

type AssistantConversationRow = {
  id?: string;
  public_conversation_id: string;
  payload_key_version: number;
  payload_nonce: string;
  payload_ciphertext: string;
  payload_auth_tag: string;
  created_at?: string;
  updated_at?: string;
};

export class SupabaseAssistantConversationRepository implements IAssistantConversationRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly configuration: IAdminConfiguration,
    private readonly logger?: ILogger
  ) {}

  async upsert(conversation: AssistantConversation): Promise<AssistantConversationUpsertResult> {
    return logOperation(
      this.logger,
      'Supabase assistant conversation upsert',
      {
        table: 'assistant_conversations',
        conversationId: conversation.id,
        publicConversationId: conversation.publicConversationId,
        pagePath: conversation.pagePath,
        language: conversation.language,
        messageCount: conversation.messageCount,
      },
      async () => {
        const encryptedPayload = encryptPayload(
          {
            conversationId: conversation.publicConversationId,
            messages: conversation.messages,
            pageContext: conversation.pageContext,
            language: conversation.language,
            savedAt: conversation.savedAt,
          },
          this.configuration
        );
        const { data, error } = await this.client
          .from('assistant_conversations')
          .upsert(
            {
              public_conversation_id: conversation.publicConversationId,
              payload_key_version: encryptedPayload.keyVersion,
              payload_nonce: encryptedPayload.nonce,
              payload_ciphertext: encryptedPayload.ciphertext,
              payload_auth_tag: encryptedPayload.authTag,
              message_count: conversation.messageCount,
              page_path: conversation.pagePath,
              language: conversation.language || null,
              last_message_at: conversation.lastMessageAt,
            },
            { onConflict: 'public_conversation_id' }
          )
          .select('*')
          .single();

        if (error) throw error;

        return {
          conversation: toConversationRecord(data, this.configuration),
          created: Boolean(data.created_at && data.updated_at && data.created_at === data.updated_at),
        };
      },
      result => ({ created: result.created, persistedConversationId: result.conversation.id })
    );
  }

  async list({
    page = 1,
    pageSize = 10,
  }: {
    page?: number;
    pageSize?: number;
  } = {}): Promise<{
    records: AssistantConversation[];
    pagination: AssistantConversationPagination;
  }> {
    return logOperation(
      this.logger,
      'Supabase assistant conversations query',
      { table: 'assistant_conversations', page, pageSize },
      async () => {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        const { data, error, count } = await this.client
          .from('assistant_conversations')
          .select('*', { count: 'exact' })
          .order('updated_at', { ascending: false })
          .range(from, to);

        if (error) throw error;

        return {
          records: data.map(row => toConversationRecord(row, this.configuration)),
          pagination: {
            page,
            pageSize,
            totalRecords: count || 0,
            totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
          },
        };
      },
      result => ({ recordCount: result.records.length, totalRecords: result.pagination.totalRecords })
    );
  }

  async findById(id: string): Promise<AssistantConversation | null> {
    return logOperation(
      this.logger,
      'Supabase assistant conversation query',
      { table: 'assistant_conversations', conversationId: id },
      async () => {
        const { data, error } = await this.client
          .from('assistant_conversations')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !data) return null;

        return toConversationRecord(data, this.configuration);
      },
      result => ({ found: Boolean(result) })
    );
  }

  async deleteById(id: string): Promise<void> {
    await logOperation(
      this.logger,
      'Supabase assistant conversation delete',
      { table: 'assistant_conversations', conversationId: id },
      async () => {
        const { error } = await this.client.from('assistant_conversations').delete().eq('id', id);

        if (error) throw error;
      }
    );
  }

  async deleteOlderThan(cutoffIso: string): Promise<number> {
    return logOperation(
      this.logger,
      'Supabase old assistant conversations delete',
      { table: 'assistant_conversations', cutoffIso },
      async () => {
        const { count, error } = await this.client
          .from('assistant_conversations')
          .delete({ count: 'exact' })
          .lt('updated_at', cutoffIso);

        if (error) throw error;

        return count || 0;
      },
      deletedCount => ({ deletedCount })
    );
  }
}

function toConversationRecord(
  row: AssistantConversationRow,
  configuration: IAdminConfiguration
): AssistantConversation {
  const payload = decryptPayload(
    {
      keyVersion: row.payload_key_version,
      nonce: row.payload_nonce,
      ciphertext: row.payload_ciphertext,
      authTag: row.payload_auth_tag,
    },
    configuration
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
  configuration: IAdminConfiguration
): EncodedValue {
  const keyVersion = configuration.getActiveAssistantConversationEncryptionKeyVersion();
  return encode(JSON.stringify(payload), getEncryptionKey(keyVersion, configuration), keyVersion);
}

function decryptPayload(
  encryptedPayload: EncodedValue,
  configuration: IAdminConfiguration
): AssistantConversationPayload {
  return JSON.parse(
    decode(encryptedPayload, getEncryptionKey(encryptedPayload.keyVersion, configuration))
  );
}

function getEncryptionKey(version: number, configuration: IAdminConfiguration): string {
  const value = configuration.getAssistantConversationEncryptionKey(version);
  if (!value) {
    throw createEncryptionError(
      'missing_assistant_conversation_encryption_key',
      `Missing assistant conversation encryption key for version ${version}`
    );
  }

  if (!isValidKey(value)) {
    throw createEncryptionError(
      'invalid_assistant_conversation_encryption_key',
      `Assistant conversation encryption key version ${version} must decode to 32 bytes`
    );
  }

  return value;
}

function createEncryptionError(code: string, message: string): Error & { code: string } {
  const error = new Error(message) as Error & { code: string };
  error.code = code;

  return error;
}
