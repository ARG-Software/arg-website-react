import type { IRagConfig } from '../../config/irag.configuration.js';
import type { IRetrievedContext } from '../../../domain/sources/retrievedcontext.types.js';
import type { IRetrievalRoute } from '../../../domain/routing/retrievalroute.types.js';
import type { RagSourceType } from '../../../domain/sources/ragsource.types.js';
import { hasNamedCommercialFact } from '../../../domain/claims/commercialclaims.js';
import { normalizeName } from '../../../domain/shared/text.js';
import type { IRagChunkReadRepository } from '../../ports/iragchunk.repository.js';
import type { IRagChunkSearchRepository } from '../../ports/iragchunksearch.repository.js';
import type { IRagSourceReadRepository, RagSourceRecord } from '../../ports/iragsource.repository.js';
import { createContextFromMatchedChunk, createContextsFromFirstChunks } from '../contextsmapper.js';
import type { IRetrievalStrategy, IRetrievalStrategyInput } from '../retrievalstrategy.js';

const DESIGNRUSH_SOURCE_KEY = 'designrush';
const FAQ_SOURCE_KEY = 'faq';
const TRUSTED_EXTERNAL_SOURCE_TYPES: RagSourceType[] = ['external_page'];

export class CommercialDeliveryRetrievalStrategy implements IRetrievalStrategy {
  constructor(
    private readonly sourceRepository: IRagSourceReadRepository,
    private readonly chunkRepository: IRagChunkReadRepository,
    private readonly chunkSearchRepository: IRagChunkSearchRepository,
    private readonly config: IRagConfig
  ) {}

  canRetrieve(route: IRetrievalRoute): boolean {
    return route.kind === 'commercial_delivery';
  }

  async retrieve({ route }: IRetrievalStrategyInput): Promise<IRetrievedContext[]> {
    switch (route.commercialKind) {
      case 'project_budget':
      case 'project_duration':
        return this.findCommercialFactContexts(route);
      case 'engagement_duration':
        return this.findEngagementDurationContexts(route);
      case 'timeline_estimate':
        return this.findFaqContexts(['Most focused MVPs', '8 to 14 weeks']);
      case 'general_pricing':
      default:
        return this.findFaqContexts(['Project budgets usually start', 'EUR 10,000']);
    }
  }

  private async findCommercialFactContexts(route: IRetrievalRoute): Promise<IRetrievedContext[]> {
    const designRush = await this.findTrustedExternalSource(DESIGNRUSH_SOURCE_KEY);
    const chunks = designRush ? await this.chunkRepository.findFirstBySourceIds([designRush.id]) : [];
    const contexts = designRush
      ? createContextsFromFirstChunks([designRush], chunks, this.config.siteUrl)
      : [];
    const projectName = route.entity.trim();

    if (!projectName) {
      return contexts;
    }

    return contexts.filter(context => hasNamedCommercialFact(context.content, projectName, route.commercialKind));
  }

  private async findEngagementDurationContexts(route: IRetrievalRoute): Promise<IRetrievedContext[]> {
    const source = await this.findFirstPartySourceByTitle(route.entity, ['project', 'partner']);
    if (!source) return [];

    const chunks = await this.chunkRepository.findFirstBySourceIds([source.id]);
    return createContextsFromFirstChunks([source], chunks, this.config.siteUrl);
  }

  private async findFaqContexts(terms: string[]): Promise<IRetrievedContext[]> {
    const matchingChunks = await this.chunkSearchRepository
      .findChunksByText({
        terms,
        matchCount: this.config.matchCount,
        sourceTypes: ['faq'],
      })
      .then(chunks => chunks.map(chunk => createContextFromMatchedChunk(chunk, this.config.siteUrl)));

    if (matchingChunks.length > 0) {
      return matchingChunks;
    }

    const source = await this.findFirstPartySourceByKey(FAQ_SOURCE_KEY, ['faq']);
    if (!source) return [];

    const chunks = await this.chunkRepository.findFirstBySourceIds([source.id]);
    return createContextsFromFirstChunks([source], chunks, this.config.siteUrl);
  }

  private async findTrustedExternalSource(sourceKey: string): Promise<RagSourceRecord | null> {
    const sources = await this.sourceRepository.findPublicByTypes({
      sourceTypes: TRUSTED_EXTERNAL_SOURCE_TYPES,
      sourceOrigin: 'trusted_external',
    });

    return sources.find(source => source.sourceKey === sourceKey) ?? null;
  }

  private async findFirstPartySourceByKey(
    sourceKey: string,
    sourceTypes: RagSourceType[]
  ): Promise<RagSourceRecord | null> {
    const sources = await this.sourceRepository.findPublicByTypes({ sourceTypes });
    return sources.find(source => source.sourceKey === sourceKey) ?? null;
  }

  private async findFirstPartySourceByTitle(
    title: string,
    sourceTypes: RagSourceType[]
  ): Promise<RagSourceRecord | null> {
    const normalizedTitle = normalizeName(title);
    const sources = await this.sourceRepository.findPublicByTypes({ sourceTypes });
    const matches = sources.filter(
      source =>
        normalizeName(source.title) === normalizedTitle || normalizeName(source.sourceKey) === normalizedTitle
    );

    return matches.length === 1 ? matches[0] : null;
  }
}
