import type { ILogger } from '../../../../shared/logger/ilogger.js';
import type { IBufferProvider } from '../../ports/ibuffer.provider.js';
import type { IOpenGraphImageProvider } from '../../ports/iopengraphimage.provider.js';
import type { ISocialCoverStorage } from '../../ports/isocialcover.storage.js';
import type { ISocialPostRepository } from '../../ports/repositories/isocialpost.repository.js';

export const SOCIAL_POST_LIMIT = 30;

export class SyncSocialPostsUseCase {
  constructor(
    private readonly bufferProvider: IBufferProvider,
    private readonly socialPostRepository: ISocialPostRepository,
    private readonly openGraphImageProvider: IOpenGraphImageProvider,
    private readonly socialCoverStorage: ISocialCoverStorage,
    private readonly logger?: ILogger
  ) {}

  async execute(): Promise<{ upserted: number }> {
    this.logger?.info('Social posts sync use case started');
    const latest = (
      await this.socialPostRepository.list({ page: 1, pageSize: 1 })
    ).records[0];
    const posts = await this.bufferProvider.listSentLinkedInPosts({
      publishedAfter: latest?.publishedAt,
      limit: latest ? undefined : SOCIAL_POST_LIMIT,
    });

    let upserted = 0;
    if (posts.length) {
      const resolved = [];
      for (const post of posts) {
        const sourceUrl =
          post.coverImageUrl || (await this.openGraphImageProvider.fetchCoverFromText(post.text));
        resolved.push({
          ...post,
          coverImageUrl: sourceUrl
            ? await this.socialCoverStorage.store(post.bufferPostId, sourceUrl)
            : null,
        });
      }

      upserted = await this.socialPostRepository.upsertMany(resolved);
    }

    const keepIds = (
      await this.socialPostRepository.list({ page: 1, pageSize: SOCIAL_POST_LIMIT })
    ).records.map(post => post.bufferPostId);
    if (keepIds.length) {
      await this.socialPostRepository.deleteMissing(keepIds);
      await this.socialCoverStorage.removeMissing(keepIds);
    }

    this.logger?.info('Social posts sync use case completed', { upserted });

    return { upserted };
  }
}
