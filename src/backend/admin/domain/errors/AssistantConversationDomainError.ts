export class AssistantConversationDomainError extends Error {
  readonly statusCode: number;
  readonly code: string;

  private constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'AssistantConversationDomainError';
    this.statusCode = statusCode;
    this.code = code;
  }

  static invalidConversationId(): AssistantConversationDomainError {
    return new AssistantConversationDomainError(
      400,
      'invalid_conversation_id',
      'Invalid conversation id'
    );
  }

  static invalidMessages(): AssistantConversationDomainError {
    return new AssistantConversationDomainError(
      400,
      'invalid_messages',
      'Conversation must include messages'
    );
  }

  static noValidMessages(): AssistantConversationDomainError {
    return new AssistantConversationDomainError(
      400,
      'invalid_messages',
      'Conversation must include valid messages'
    );
  }

  static missingEncryptionKey(version: number): AssistantConversationDomainError {
    return new AssistantConversationDomainError(
      503,
      'missing_assistant_conversation_encryption_key',
      `Missing assistant conversation encryption key for version ${version}`
    );
  }

  static invalidEncryptionKey(version: number): AssistantConversationDomainError {
    return new AssistantConversationDomainError(
      503,
      'invalid_assistant_conversation_encryption_key',
      `Assistant conversation encryption key version ${version} must decode to 32 bytes`
    );
  }
}
