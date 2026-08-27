import { AssistantConversationDomainError } from './errors/assistantconversationdomain.error.js';
import type {
  AssistantConversationAction,
  AssistantConversationConstructorParams,
  AssistantConversationMessage,
  AssistantConversationMessageInput,
  AssistantConversationPageContext,
} from './types/assistantconversation.types.js';

export class AssistantConversation {
  readonly id?: string;
  readonly publicConversationId: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly messages: AssistantConversationMessage[];
  readonly pageContext: AssistantConversationPageContext;
  readonly language: string;
  readonly savedAt: string;
  readonly messageCount: number;
  readonly pagePath: string | null;
  readonly lastMessageAt: string;
  readonly preview: string;

  constructor(params: AssistantConversationConstructorParams) {
    this.id = params.id;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
    this.publicConversationId = params.publicConversationId;
    this.messages = this.createMessages(params.messages);
    this.pageContext = {
      pathname: params.pageContext?.pathname || '',
      title: params.pageContext?.title || '',
    };
    if (params.pageContext?.activeSection) {
      this.pageContext.activeSection = params.pageContext.activeSection;
    }
    this.language = params.language || '';
    this.savedAt = params.savedAt || new Date().toISOString();
    this.messageCount = this.messages.length;
    this.pagePath = this.pageContext.pathname || null;
    this.lastMessageAt = this.getLastMessageAt();
    this.preview = this.getPreview();
  }

  hasVisitorMessage(): boolean {
    return this.messages.some(message => message.role === 'user');
  }

  private createMessages(
    value: AssistantConversationMessageInput[]
  ): AssistantConversationMessage[] {
    if (!Array.isArray(value) || value.length === 0) {
      throw AssistantConversationDomainError.invalidMessages();
    }

    const messages: AssistantConversationMessage[] = [];

    for (const input of value) {
      const role = input.role || '';
      const content = input.content || '';
      if ((role !== 'user' && role !== 'assistant') || !content) continue;

      const message: AssistantConversationMessage = { role, content };
      const source = input.source || '';
      const language = input.language || '';

      if (source) message.source = source;
      if (language) message.language = language;
      if (input.createdAt) message.createdAt = input.createdAt;

      if (Array.isArray(input.citations)) {
        message.citations = input.citations.map(item => ({
          title: item.title || '',
          url: item.url || '',
        }));
      }

      if (Array.isArray(input.articleRecommendations)) {
        message.articleRecommendations = input.articleRecommendations.map(item => ({
          title: item.title || '',
          url: item.url || '',
        }));
      }

      if (Array.isArray(input.actions)) {
        const actions: AssistantConversationAction[] = [];

        for (const action of input.actions) {
          const type = action.type || '';
          if (type) actions.push({ type });
        }

        if (actions.length) message.actions = actions;
      }

      messages.push(message);
    }

    if (messages.length === 0) {
      throw AssistantConversationDomainError.noValidMessages();
    }

    return messages;
  }

  private getLastMessageAt(): string | undefined {
    for (let index = this.messages.length - 1; index >= 0; index -= 1) {
      if (this.messages[index].createdAt) return this.messages[index].createdAt;
    }

    return this.savedAt;
  }

  private getPreview(): string {
    const firstUserMessage = this.messages.find(
      message => message.role === 'user' && message.content
    );
    const content =
      firstUserMessage?.content || this.messages.find(message => message.content)?.content || '';
    const text = String(content).trim().slice(0, 141);

    return text.length > 140 ? `${text.slice(0, 137)}...` : text;
  }
}
