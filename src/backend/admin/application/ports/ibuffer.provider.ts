import type { SocialPost } from '../../domain/types/socialpost.types.js';

export type BufferSentPost = Omit<SocialPost, 'id'>;

export interface IBufferProvider {
  listSentLinkedInPosts(): Promise<BufferSentPost[]>;
}
