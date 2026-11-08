import type { SocialPost } from '../../../domain/types/socialpost.types.js';

export type SocialPostSort = 'recent' | 'likes';

export type SocialPostListQuery = {
  page: number;
  pageSize: number;
  sort: SocialPostSort;
};

export type SocialPostListResult = {
  records: SocialPost[];
  totalRecords: number;
};

export interface ISocialPostRepository {
  list(query: SocialPostListQuery): Promise<SocialPostListResult>;
  upsertMany(posts: SocialPost[]): Promise<number>;
  deleteMissing(keepBufferPostIds: string[]): Promise<number>;
}
