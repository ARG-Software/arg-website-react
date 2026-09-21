import type { SupabaseClient } from '@supabase/supabase-js';

import { SupabaseRepositoryBase } from '../../../../shared/infrastructure/repositories/supabase/supabaserepositorybase.js';
import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { logOperation } from '../../../../shared/logger/logoperation.js';
import type {
  ISocialPostRepository,
  SocialPostListQuery,
  SocialPostListResult,
} from '../../../application/ports/repositories/isocialpost.repository.js';
import type { SocialPost } from '../../../domain/types/socialpost.types.js';

type SocialPostRow = {
  id: string;
  buffer_post_id: string;
  text: string;
  cover_image_url: string | null;
  external_url: string | null;
  published_at: string;
  like_count: number;
};

export class SupabaseSocialPostRepository extends SupabaseRepositoryBase implements ISocialPostRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly logger?: ILogger
  ) {
    super();
  }

  async list({ page, pageSize }: SocialPostListQuery): Promise<SocialPostListResult> {
    return logOperation(
      this.logger,
      'Supabase social posts query',
      { table: 'social_posts', page, pageSize },
      async () => {
        const { from, to } = this.getPageRange(page, pageSize);
        const { data, error, count } = await this.client
          .from('social_posts')
          .select(
            'id, buffer_post_id, text, cover_image_url, external_url, published_at, like_count',
            { count: 'exact' }
          )
          .order('published_at', { ascending: false })
          .range(from, to);

        if (error) throw error;

        return {
          records: (data || []).map(toSocialPost),
          totalRecords: count || 0,
        };
      },
      result => ({ recordCount: result.records.length, totalRecords: result.totalRecords })
    );
  }

  async upsertMany(posts: SocialPost[]): Promise<number> {
    return logOperation(
      this.logger,
      'Supabase social posts upsert',
      { table: 'social_posts', recordCount: posts.length },
      async () => {
        const { error } = await this.client.from('social_posts').upsert(
          posts.map(post => ({
            buffer_post_id: post.bufferPostId,
            text: post.text,
            cover_image_url: post.coverImageUrl,
            external_url: post.externalUrl,
            published_at: post.publishedAt,
            like_count: post.likeCount,
          })),
          { onConflict: 'buffer_post_id' }
        );

        if (error) throw error;

        return posts.length;
      }
    );
  }

  async deleteMissing(keepBufferPostIds: string[]): Promise<number> {
    if (!keepBufferPostIds.length) return 0;

    return logOperation(
      this.logger,
      'Supabase social posts prune',
      { table: 'social_posts', recordCount: keepBufferPostIds.length },
      async () => {
        const { count, error } = await this.client
          .from('social_posts')
          .delete({ count: 'exact' })
          .not('buffer_post_id', 'in', `(${keepBufferPostIds.join(',')})`);

        if (error) throw error;

        return count || 0;
      },
      result => ({ recordCount: result })
    );
  }
}

function toSocialPost(row: SocialPostRow): SocialPost {
  return {
    id: row.id,
    bufferPostId: row.buffer_post_id,
    text: row.text,
    coverImageUrl: row.cover_image_url,
    externalUrl: row.external_url,
    publishedAt: row.published_at,
    likeCount: Number(row.like_count || 0),
  };
}
