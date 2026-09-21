import type { SocialPost } from '../../domain/types/socialpost.types.js';

export type BufferSentPost = Omit<SocialPost, 'id'>;

export type ListSentLinkedInPostsInput = {
  publishedAfter?: string;
  limit?: number;
};

export interface IBufferProvider {
  listSentLinkedInPosts(input?: ListSentLinkedInPostsInput): Promise<BufferSentPost[]>;
}
