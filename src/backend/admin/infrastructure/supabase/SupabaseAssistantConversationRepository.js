export class SupabaseAssistantConversationRepository {
  constructor(client, payloadCipher) {
    this.client = client;
    this.payloadCipher = payloadCipher;
  }

  async upsert(logRecord) {
    const row = toDatabaseRow(logRecord, this.payloadCipher);
    const { data, error } = await this.client
      .from('assistant_conversations')
      .upsert(row, { onConflict: 'public_conversation_id' })
      .select('*')
      .single();

    if (error) throw error;

    return toConversationRecord(data, this.payloadCipher);
  }

  async list({ page = 1, pageSize = 10 } = {}) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await this.client
      .from('assistant_conversations')
      .select(
        'id, public_conversation_id, message_count, page_path, language, last_message_at, created_at, updated_at',
        { count: 'exact' }
      )
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      records: data.map(toConversationSummaryRecord),
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

    return toConversationRecord(data, this.payloadCipher);
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

function toConversationSummaryRecord(row) {
  return {
    id: row.id,
    publicConversationId: row.public_conversation_id,
    payload: null,
    messageCount: row.message_count,
    pagePath: row.page_path,
    language: row.language,
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toDatabaseRow(logRecord, payloadCipher) {
  const encryptedPayload = payloadCipher.encrypt(logRecord.payload);

  return {
    public_conversation_id: logRecord.publicConversationId,
    payload_key_version: encryptedPayload.keyVersion,
    payload_nonce: encryptedPayload.nonce,
    payload_ciphertext: encryptedPayload.ciphertext,
    payload_auth_tag: encryptedPayload.authTag,
    message_count: logRecord.metadata.messageCount,
    page_path: logRecord.metadata.pagePath,
    language: logRecord.metadata.language,
    last_message_at: logRecord.metadata.lastMessageAt,
  };
}

function toConversationRecord(row, payloadCipher) {
  return {
    id: row.id,
    publicConversationId: row.public_conversation_id,
    payload: payloadCipher.decrypt(row),
    messageCount: row.message_count,
    pagePath: row.page_path,
    language: row.language,
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
