import type { ILogger } from '../../../../shared/logger/ilogger.js';
import type { IGitHubReleasesProvider } from '../../ports/igithubreleases.provider.js';
import type { IArchitectReleaseRepository } from '../../ports/repositories/iarchitectrelease.repository.js';

export class SyncArchitectReleasesUseCase {
  constructor(
    private readonly gitHubReleasesProvider: IGitHubReleasesProvider,
    private readonly architectReleaseRepository: IArchitectReleaseRepository,
    private readonly logger?: ILogger
  ) {}

  async execute(): Promise<{ upserted: number }> {
    this.logger?.info('Architect releases sync use case started');
    const latest = (
      await this.architectReleaseRepository.list({ page: 1, pageSize: 1 })
    ).records[0];
    const releases = await this.gitHubReleasesProvider.listReleases({
      publishedAfter: latest?.publishedAt,
    });
    if (!releases.length) {
      this.logger?.info('Architect releases sync use case completed', { upserted: 0 });
      return { upserted: 0 };
    }

    const upserted = await this.architectReleaseRepository.upsertMany(releases);
    this.logger?.info('Architect releases sync use case completed', { upserted });
    return { upserted };
  }
}
