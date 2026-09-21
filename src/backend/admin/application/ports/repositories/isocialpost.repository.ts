import type { SocialPost } from '../../../domain/types/socialpost.types.js';

export type SocialPostListQuery = {
  page: number;
  pageSize: number;
};

export type SocialPostListResult = {
  records: SocialPost[];
  totalRecords: number;
};

export interface ISocialPostRepository {
  list(query: SocialPostListQuery): Promise<SocialPostListResult>;
  upsertMany(posts: SocialPost[]): Promise<number>;
}
