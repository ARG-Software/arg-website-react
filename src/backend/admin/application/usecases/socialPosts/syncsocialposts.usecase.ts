import type { ILogger } from '../../../../shared/logger/ilogger.js';
import type { IBufferProvider } from '../../ports/ibuffer.provider.js';
import type { ISocialPostRepository } from '../../ports/repositories/isocialpost.repository.js';

export class SyncSocialPostsUseCase {
  constructor(
    private readonly bufferProvider: IBufferProvider,
    private readonly socialPostRepository: ISocialPostRepository,
    private readonly logger?: ILogger
  ) {}

  async execute(): Promise<{ upserted: number }> {
    this.logger?.info('Social posts sync use case started');
    const posts = await this.bufferProvider.listSentLinkedInPosts();
    if (!posts.length) {
      this.logger?.info('Social posts sync use case completed', { upserted: 0 });
      return { upserted: 0 };
    }

    const upserted = await this.socialPostRepository.upsertMany(posts);
    this.logger?.info('Social posts sync use case completed', { upserted });

    return { upserted };
  }
}
