import type { IRetrievedContext } from '../../../domain/sources/retrievedcontext.types.js';
import type { IRagConfig } from '../../config/irag.configuration.js';
import type { IRagChunkSearchRepository } from '../../ports/iragchunksearch.repository.js';
import { createContextFromMatchedChunk } from '../contextsmapper.js';
import {
  AUTHORITATIVE_TECHNOLOGY_SOURCE_TYPES,
  BLOG_TECHNOLOGY_SOURCE_TYPES,
  filterExactTechnologyEvidence,
  getTechnologySourcePriority,
  isExactTechnologySubject,
} from '../../../domain/claims/technologyclaims.js';
import { getTechnologySearchTerms } from '../../../domain/technologies/technologynames.js';

export class ExactTechnologyEvidenceRetriever {
  constructor(
    private readonly chunkSearchRepository: IRagChunkSearchRepository,
    private readonly config: IRagConfig
  ) {}

  async retrieveAuthoritativeEvidence(subject: string): Promise<IRetrievedContext[]> {
    if (!isExactTechnologySubject(subject)) {
      return [];
    }

    const contexts = await this.chunkSearchRepository.findChunksByText({
      terms: getTechnologySearchTerms(subject),
      matchCount: Math.max(this.config.matchCount * 4, 20),
      sourceTypes: AUTHORITATIVE_TECHNOLOGY_SOURCE_TYPES,
    }).then(chunks => chunks.map(chunk => createContextFromMatchedChunk(chunk, this.config.siteUrl)));

    return filterExactTechnologyEvidence(contexts, subject)
      .sort((left, right) => getTechnologySourcePriority(left.sourceType) - getTechnologySourcePriority(right.sourceType))
      .slice(0, this.config.matchCount);
  }

  async retrieveBlogEvidence(subject: string): Promise<IRetrievedContext[]> {
    if (!isExactTechnologySubject(subject)) {
      return [];
    }

    const contexts = await this.chunkSearchRepository.findChunksByText({
      terms: getTechnologySearchTerms(subject),
      matchCount: Math.max(this.config.matchCount * 2, 12),
      sourceTypes: BLOG_TECHNOLOGY_SOURCE_TYPES,
    }).then(chunks => chunks.map(chunk => createContextFromMatchedChunk(chunk, this.config.siteUrl)));

    return filterExactTechnologyEvidence(contexts, subject).slice(0, 2);
  }
}
