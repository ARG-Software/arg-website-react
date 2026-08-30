import type { IChatMessage } from '../../domain/conversation/chatmessage.types.js';

export interface IPromptMessage {
  role: 'system' | IChatMessage['role'];
  content: string;
}
