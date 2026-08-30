import type { IRagConfig } from '../../config/irag.configuration.js';
import type { IRetrievedContext } from '../../../domain/sources/retrievedcontext.types.js';
import {
  getReferenceRank,
  getRequestedProjectCount,
} from '../../../domain/claims/projectreferenceclaims.js';
import type { IRagChunkReadRepository } from '../../ports/iragchunk.repository.js';
import type { IRagSourceReadRepository, RagSourceRecord } from '../../ports/iragsource.repository.js';
import { createContextsFromFirstChunks } from '../contextsmapper.js';

export class ProjectReferenceRetriever {
  constructor(
    private readonly sourceRepository: IRagSourceReadRepository,
    private readonly chunkRepository: IRagChunkReadRepository,
    private readonly config: IRagConfig
  ) {}

  async retrieve(question: string, subject: string): Promise<IRetrievedContext[]> {
    const sources = await this.sourceRepository.findPublicByTypes({
      sourceTypes: ['homepage', 'project'],
    });
    const homepageProjectsSource = sources.find(
      source => source.sourceType === 'homepage' && source.sourceKey === 'home:projects'
    );
    const projectSources = sources
      .filter(source => source.sourceType === 'project')
      .filter(hasReferenceRank)
      .sort((left, right) => getReferenceRank(left.metadata) - getReferenceRank(right.metadata))
      .slice(0, getRequestedProjectCount(`${subject} ${question}`, this.config.matchCount));
    const selectedSources = [
      ...(homepageProjectsSource ? [homepageProjectsSource] : []),
      ...projectSources,
    ];
    const chunks = await this.chunkRepository.findFirstBySourceIds(
      selectedSources.map(source => source.id)
    );
    return createContextsFromFirstChunks(selectedSources, chunks, this.config.siteUrl);
  }
}

function hasReferenceRank(source: RagSourceRecord): boolean {
  return Number.isFinite(getReferenceRank(source.metadata));
}
