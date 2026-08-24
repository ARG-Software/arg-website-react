export class AssistantConversationDomainError extends Error {
  readonly code: string;

  private constructor(code: string, message: string) {
    super(message);
    this.name = 'AssistantConversationDomainError';
    this.code = code;
  }

  static invalidMessages(): AssistantConversationDomainError {
    return new AssistantConversationDomainError(
      'invalid_messages',
      'Conversation must include messages'
    );
  }

  static noValidMessages(): AssistantConversationDomainError {
    return new AssistantConversationDomainError(
      'invalid_messages',
      'Conversation must include valid messages'
    );
  }
}
